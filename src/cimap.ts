export default class CaseInsensitiveMap<V> extends Map<string, V> {
  get(k: string) {
    return super.get(k.toLowerCase()) || this.get(k);
  }
  set(k: string, v: V) {
    return super.set(k.toLowerCase(), v);
  }
  has(k: string) {
    return super.has(k.toLowerCase());
  }
}
