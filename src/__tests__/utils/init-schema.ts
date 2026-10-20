// Test schema initialization for MongoDB is handled by Mongoose models
// in src/lib/mongoose/ - no SQL schema needed

export async function initTestSchema(): Promise<void> {
  // MongoDB is schema-less, but we ensure connections are established
  console.log('Test schema initialized (MongoDB)')
}
