// PouchDB probes Blob support by storing a Blob in IndexedDB. fake-indexeddb aborts that transaction on
// Node 20 (the release workflow's version), which breaks every database call. Lemma stores no attachments.
if (Number(process.versions.node.split('.')[0]) < 22) {
    Reflect.deleteProperty(globalThis, 'Blob');
}
