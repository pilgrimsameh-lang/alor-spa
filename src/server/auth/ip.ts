import ipaddr from 'ipaddr.js';

/**
 * ============================================================================
 * ALOR SPA — Hardened IP Extraction & Reverse Proxy Traversal
 * Prevents IP spoofing, header poisoning & collective proxy blacklisting
 * ============================================================================
 */

export class InvalidIpHeaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIpHeaderError';
  }
}

const DEFAULT_LOCAL_PROXIES = ['127.0.0.1/32', '::1/128', '127.0.0.0/8'];

/**
 * Parses and normalizes a CIDR string into an [ipaddr.IPv4 | ipaddr.IPv6, number] range tuple.
 */
function parseCidr(cidr: string): [ipaddr.IPv4 | ipaddr.IPv6, number] | null {
  try {
    const trimmed = cidr.trim();
    if (trimmed.includes('/')) {
      return ipaddr.parseCIDR(trimmed);
    }
    const parsed = ipaddr.parse(trimmed);
    const bits = parsed.kind() === 'ipv4' ? 32 : 128;
    return [parsed, bits];
  } catch {
    return null;
  }
}

/**
 * Checks if a parsed IP address matches a given CIDR range.
 */
export function isIpInCidr(ip: ipaddr.IPv4 | ipaddr.IPv6, cidrStr: string): boolean {
  const cidr = parseCidr(cidrStr);
  if (!cidr) return false;
  try {
    return ip.match(cidr);
  } catch {
    return false;
  }
}

/**
 * Checks if a parsed IP matches any CIDR in a list of trusted proxies.
 */
export function isTrustedProxy(ip: ipaddr.IPv4 | ipaddr.IPv6, trustedCidrs: string[]): boolean {
  for (const cidr of trustedCidrs) {
    if (isIpInCidr(ip, cidr)) {
      return true;
    }
  }
  return false;
}

/**
 * Safely parses an IP string. Returns null if invalid or malformed.
 */
export function safeParseIp(ipStr: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
  if (!ipStr || typeof ipStr !== 'string') return null;
  const trimmed = ipStr.trim();
  if (!trimmed) return null;

  try {
    if (ipaddr.isValid(trimmed)) {
      return ipaddr.parse(trimmed);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts and strictly validates the authentic client IP address.
 * 
 * Rules:
 * 1. If direct peer IP is NOT in trusted proxies list, `X-Forwarded-For` is 100% ignored.
 * 2. If direct peer IS a trusted proxy, `X-Forwarded-For` is parsed from right to left.
 * 3. Any malformed or unparseable IP in `X-Forwarded-For` immediately throws InvalidIpHeaderError (triggering HTTP 400).
 * 4. If all IPs in `X-Forwarded-For` are trusted proxies, throws InvalidIpHeaderError to prevent collapsing all clients onto a single shared proxy.
 */
export function extractClientIp(params: {
  peerIp: string;
  forwardedForHeader?: string | string[] | null;
  trustedProxies?: string[];
}): string {
  const trustedList = params.trustedProxies?.length
    ? params.trustedProxies
    : DEFAULT_LOCAL_PROXIES;

  const parsedPeer = safeParseIp(params.peerIp);
  if (!parsedPeer) {
    throw new InvalidIpHeaderError('Direct socket peer IP is malformed or invalid.');
  }

  // 1. If peer is untrusted, never trust forward headers
  if (!isTrustedProxy(parsedPeer, trustedList)) {
    return parsedPeer.toString();
  }

  // 2. Peer is trusted proxy: inspect X-Forwarded-For
  const rawHeader = params.forwardedForHeader;
  if (!rawHeader) {
    return parsedPeer.toString();
  }

  const headerStr = Array.isArray(rawHeader) ? rawHeader.join(',') : rawHeader;
  const parts = headerStr
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return parsedPeer.toString();
  }

  // Parse all IPs first: reject immediately on any malformed entry
  const parsedChain: Array<{ raw: string; parsed: ipaddr.IPv4 | ipaddr.IPv6 }> = [];
  for (const part of parts) {
    const parsed = safeParseIp(part);
    if (!parsed) {
      throw new InvalidIpHeaderError(`Malformed IP address in X-Forwarded-For header: "${part}"`);
    }
    parsedChain.push({ raw: part, parsed });
  }

  // Traverse right-to-left: the first non-trusted IP is the authentic client
  for (let i = parsedChain.length - 1; i >= 0; i--) {
    const item = parsedChain[i];
    if (!isTrustedProxy(item.parsed, trustedList)) {
      return item.parsed.toString();
    }
  }

  // If every single IP in the chain was a trusted proxy, reject to prevent shared proxy lockout
  throw new InvalidIpHeaderError(
    'All IP addresses in X-Forwarded-For are trusted proxies; authentic client cannot be determined.'
  );
}
