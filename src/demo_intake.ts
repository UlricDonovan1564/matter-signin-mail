import { openMatterPortal } from "./matter_portal.ts";

const result = await openMatterPortal({
  email: "chenhua@changba.com",
  password: "signed-matter-passphrase",
  name: "Avery Chen",
  matterTitle: "Harbor lease review",
  signedDocumentName: "Harbor lease.pdf",
  deadline: "2026-10-02",
});

console.log(result);
