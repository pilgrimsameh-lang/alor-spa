import * as schema from '../src/server/db/schema';

console.log('Schema tables loaded successfully:');
console.log('massageTypes:', Boolean(schema.massageTypes));
console.log('serviceVariants:', Boolean(schema.serviceVariants));
console.log('packages:', Boolean(schema.packages));
console.log('packageOptions:', Boolean(schema.packageOptions));
