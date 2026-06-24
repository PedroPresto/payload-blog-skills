import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // useAPIKey enables a per-user API key for external automation.
    // Each user can generate one in the admin panel (their profile page).
    // The key is passed as: Authorization: users API-Key <key>
    useAPIKey: true,
  },
  admin: {
    useAsTitle: "email",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [],
};
