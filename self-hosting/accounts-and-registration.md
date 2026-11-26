---
title: Accounts and registration
description: Create the owner, set the company roles, choose who can sign up, invite people and deactivate users.
order: 8
---

# Accounts and registration

## Roles

| Role | Who | What the role can do |
|---|---|---|
| Owner | The person who runs the instance. The `is_owner` flag marks this user. | Everything that an admin can do. Also opens `/admin` and `/horizon`. |
| `admin` | A member of a company. | Creates and changes templates, snaps, forms and tokens. |
| `customer` | A member of a company. | Creates content, the same as `admin`. |

Each user belongs to one company. Templates, snaps, forms and tokens belong to the company of the user.

Each user also has a company role: owner or member. The company role controls the changes to the company. Read [Company roles](#company-roles).

## Company roles

The company role is `owner` or `member`. The `users.company_role` column stores it. A company owner is not the owner of the instance. The instance owner has the `is_owner` flag and opens `/admin`.

| Company role | What the role can do |
|---|---|
| Owner | Everything that a member can do. Also renames the company, sends and cancels invitations, rotates the webhook secret, deletes fonts and changes the company roles of the users. |
| Member | Creates and changes the shared content of the company: templates, snaps, collections, forms, tags and media. |

If a member tries an owner action, the request returns 403. The page shows "Only a company owner can do this."

A user gets a company role when the account is created:

- The user who creates a company is its owner. The owner from `/setup` or `snapsbrew:install` is the owner of the first company.
- With open registration, each new account gets a new company. The new user is the owner of that company.
- A user who signs up with an invitation joins the company as a member.
- An upgrade from a version without company roles runs a migration. The migration makes the first active user of each company the owner. If no user of the company is active, the first user becomes the owner. Every other user becomes a member.

### Make a member an owner

1. Sign in as an owner of the company.
2. Open **Account > Users**.
3. Click **Make owner** on the row of the member.
4. Confirm in the browser dialog.

A company can have more than one owner. To make an owner a member, click **Make member** on the row of the owner.

`php artisan snapsbrew:user:list --json` and the `list-users` tool of the instance-admin MCP server show the `company_role` of each user. **Admin > Users** shows it too.

### Set a company role from the command line

The instance owner can set a company role without a browser. To make a user an owner, run:

```bash
php artisan snapsbrew:user:role person@example.com owner
```

To make an owner a member, use `member` instead of `owner`. With Docker, add `docker compose exec web` before the command. The command uses the same rules as **Account > Users**.

With `--json`, stdout holds one JSON object. The exit codes are:

| Exit code | Meaning |
|---|---|
| 0 | The role changed, or the user already had this role. |
| 2 | Bad input: no user has the email, the role is not `owner` or `member`, or the user has no company. |
| 3 | The user is the last active owner of the company. |

### The last active owner

An active owner is an owner who is not deactivated. A company that has active users always keeps at least one active owner. A deactivated owner does not count.

- The last active owner cannot become a member. Its row on **Account > Users** shows "The last active owner stays an owner."
- `snapsbrew:user:role` refuses the same change with exit code 3.
- The instance owner cannot deactivate the last active owner. Read [Deactivate a user](#deactivate-a-user).

To hand over a company, make the new user an owner first. Then make the old owner a member.

If the instance owner deletes the last owner of a company, the oldest active account of that company becomes the owner.

### A company with no active owner

A company can have active users but no active owner. For example, the owner of a company was deactivated before this rule existed. Nobody in such a company can change the roles.

`php artisan snapsbrew:doctor` reports each of these companies in the check `company_owners`. The fix line gives one command for each company. To correct a company, run this command with the email of an active user of the company:

```bash
php artisan snapsbrew:user:role person@example.com owner
```

## Create the owner

The first account of an instance is the owner. Create it in one of two ways:

- **The setup page.** Open `/setup?token=<token>`. The container prints the full URL as the last line of its log. Run `php artisan snapsbrew:setup-url` to show it again.
- **The command line.** Run `php artisan snapsbrew:install --name="Ada Lovelace" --email=ada@example.com`. You can also give `--company`. The command does not take a password. It returns a one-time `login_url`, and the owner sets a password after the first login. With `--with-token=<name>`, it also returns an API token and a ready `claude mcp add` line.

The setup page is open only while the `users` table is empty. While no user exists, `/`, `/login` and `/register` send the visitor to `/setup`. Without a correct token, `/setup` shows how to get the setup URL. After the first account exists, `/setup` returns 404.

The setup page and the command already ask for the name and the company, so the owner skips the onboarding wizard and goes to the dashboard.

The setup token comes from `APP_KEY` through HMAC-SHA256. The instance stores no token. The setup routes accept 10 requests a minute.

`php artisan snapsbrew:install` creates no second owner. If an owner exists, it shows the email of the owner and stops.

## Make another user the owner

To make an existing user the owner, run:

```bash
php artisan snapsbrew:install --promote=person@example.com
```

With Docker, add `docker compose exec web` before the command. The command sets the owner flag and creates no account.

An instance can have more than one owner. `--promote` adds the owner flag to the user. It does not remove the flag from the current owner.

## Remove the owner flag

To remove the owner flag from a user, run:

```bash
php artisan snapsbrew:install --demote=person@example.com
```

The command refuses to demote the last owner, because an instance with no owner has nobody who can open `/admin` and `/horizon`. To hand over the instance, promote the new owner first, then demote the old owner. The command also refuses an email that no user has and a user who is not an owner.

## Registration modes

| Mode | Who can sign up | Company of the new account |
|---|---|---|
| Invite only | Only a person with a pending company invitation. | The company of the invitation. |
| Open | Anyone. | A new company for each account. |

In both modes, an invitation works.

The mode comes from two places:

1. The value that the owner sets in **Admin > Settings** (`/admin/settings`). The app stores it in the `instance_settings` table.
2. `REGISTRATION_ENABLED`, when the owner has set no value. `false` is invite only and `true` is open. The default is `false`.

The value in **Admin > Settings** wins over `REGISTRATION_ENABLED`.

## Invite people

Only an owner of the company can send invitations.

1. Open **Account > Users**.
2. Type the email of the person.
3. Send the invitation.

The app sends an email with a link to `/register?invitation=<token>`. The invitation expires after 7 days. The app refuses a second invitation while the first one is pending. It also refuses an email that is already a member of the company.

After each invitation, the page shows the invite link. Each pending invitation has a **Copy invite link** button. You can send the link in a chat message, and the person signs up with it.

The invitation email needs a working mailer. If `MAIL_MAILER` is `log`, the app sends no email. The page then says "Mail is not set up. Send this link yourself." If the mailer fails, the invitation stays and the page gives the link. The page says that the invitation went out only when a mail went out. To set up a mailer, read [Configuration](configuration.md).

A user who signs up later sees an onboarding page. For a company owner, it can send up to 25 invitations at one time. A member does not see the invitation step. If `MAIL_MAILER` is `log`, the last step shows the invite links. The onboarding steps close when the user finishes onboarding.

One company can send 20 invitation emails in 24 hours, from the account page and the onboarding page together. `SNAPSBREW_INVITATIONS_PER_COMPANY_PER_DAY` changes this number.

## The admin area

Only the owner can open `/admin`. Every other visitor, a guest included, gets a 404.

| Page | What it does |
|---|---|
| **Admin > Users** (`/admin/users`) | Lists every account of the instance with its company and company role, with a search by name or email. Deactivates, reactivates and deletes users. |
| **Admin > Settings** (`/admin/settings`) | Sets the registration mode. |

## Deactivate a user

The owner can deactivate a user in **Admin > Users**. A deactivated user keeps all data, but cannot authenticate:

- The login form refuses the user and shows the reason.
- An open web session ends at the next request.
- The API tokens of the user stop working.
- The OAuth tokens of the MCP server stop working.
- The signed URL keys of the user stop working. The signed URLs of the templates that the user created show the placeholder image.
- The embedded forms of the user return 404.

To restore access, click **Reactivate**. The tokens, the signed URLs and the forms of the user work again.

The owner cannot deactivate an owner. The request returns 403.

The owner cannot deactivate the last active owner of a company while the company has other active users. The page shows an error. Make another active user of the company an owner first. Then deactivate the user. If the company has no other active user, the deactivation works.

## Delete a user

Use a delete for a privacy request. Deactivation keeps the data, and a delete removes it. You cannot undo a delete.

1. Open **Admin > Users**.
2. Click **Delete** on the row of the user.
3. Confirm in the browser dialog.

The delete removes:

- The account, the profile image and the database sessions of the user.
- The API tokens, the signed URL keys and the OAuth tokens of the user.
- The usage log rows of the user. These rows hold the IP address of each request.
- The activity log rows that the user caused.
- The screenshots of the user.

The templates, snaps, forms and collections belong to the company. They stay while the company has another member. If the user is the last member of the company, the delete also removes the company and all of its content: templates, snaps, collections, forms, imports, fonts, tags and keys.

The owner cannot delete an owner. The request returns 403. To delete an owner, remove the owner flag first. Read [Remove the owner flag](#remove-the-owner-flag).

## Two-factor authentication

Each user can turn on two-factor authentication (TOTP) in **Account > Security**. The login and the two-factor challenge each accept 5 attempts a minute.

If a user loses the two-factor device, the owner can turn it off from the command line. Read [Recover access](recover-access.md).

## Passwords

The password rules are the Laravel defaults: at least 8 characters. The setup page, the registration form, the password reset and `php artisan snapsbrew:user:password` use the same rules.
