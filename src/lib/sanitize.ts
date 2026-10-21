/**
 * Convert a Mongoose lean doc (or array) to a plain serializable object
 * safe for passing as props to Client Components in React 19.
 *
 * React 19 throws when any prop contains an object with a toJSON method
 * (Mongoose ObjectId wrappers have one). This normalises _id / populated
 * refs and strips __v.
 */
export function sanitize<T>(doc: T): T {
  if (doc === null || doc === undefined) return doc
  if (Array.isArray(doc)) return doc.map(sanitize) as unknown as T

  const obj = doc as Record<string, unknown>
  if (obj._id && typeof (obj._id as any).toString === "function") {
    obj._id = (obj._id as any).toString()
  }
  for (const key of Object.keys(obj)) {
    if (key === "__v") delete obj[key]
    const val = obj[key]
    if (val && typeof val === "object" && !Array.isArray(val) && "toString" in val) {
      obj[key] = (val as any).toString()
    } else if (Array.isArray(val)) {
      obj[key] = val.map((item) =>
        item && typeof item === "object" && "toString" in item
          ? (item as any).toString()
          : item
      )
    }
  }
  return obj as unknown as T
}
