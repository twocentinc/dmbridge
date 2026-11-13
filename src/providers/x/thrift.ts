import { Buffer } from "node:buffer";

// A bounded binary-protocol reader for the SDK's raw event envelope. Binary
// strings stay bytes; this must never log payloads or interpret private text.
export function readThrift(bytes: Buffer) {
  let offset = 0;
  let budget = 10_000;
  function take(size: number) {
    if (size < 0 || offset + size > bytes.length) throw Error("Thrift bounds");
    const result = bytes.subarray(offset, offset + size);
    offset += size;
    return result;
  }
  function count() {
    const size = take(4).readInt32BE();
    if (size < 0 || size > 10_000) throw Error("Thrift collection size");
    return size;
  }
  // Values are heterogeneous, keyed by the field IDs in the upstream schema.
  function value(type: number, depth = 0): any {
    if (depth > 32 || --budget < 0) throw Error("Thrift limit");
    switch (type) {
      case 2: case 3: return take(1).readUInt8();
      case 6: return take(2).readInt16BE();
      case 8: return take(4).readInt32BE();
      case 10: case 4: return take(8);
      case 11: return take(take(4).readInt32BE());
      case 12: {
        const fields: Record<number, { type: number; value: any }> = {};
        for (;;) {
          const fieldType = take(1).readUInt8();
          if (!fieldType) return fields;
          const id = take(2).readInt16BE();
          if (id in fields) throw Error("Duplicate Thrift field");
          fields[id] = { type: fieldType, value: value(fieldType, depth + 1) };
        }
      }
      case 13: {
        const keyType = take(1).readUInt8();
        const valueType = take(1).readUInt8();
        return Array.from({ length: count() }, () => [
          value(keyType, depth + 1), value(valueType, depth + 1),
        ]);
      }
      case 14: case 15: {
        const itemType = take(1).readUInt8();
        return Array.from({ length: count() }, () => value(itemType, depth + 1));
      }
      default: throw Error("Unsupported Thrift type");
    }
  }
  const result = value(12);
  if (offset !== bytes.length) throw Error("Trailing Thrift bytes");
  return result;
}
