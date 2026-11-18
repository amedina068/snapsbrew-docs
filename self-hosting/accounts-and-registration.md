---
title: Accounts and registration
description: Create the owner, choose who can sign up, invite people and deactivate users.
order: 8
---

# Accounts and registration

## Roles

| Role | Who | What the role can do |
|---|---|---|
| Owner | The person who runs the instance. The `is_owner` flag marks this user. | Everything that an admin can do. Also opens `/admin` and `/horizon`. |
| `admin` | A member of a company. | Creates and changes templates, snaps, forms, tokens and invitations. |
| `customer` | A member of a company. | Creates content, the same as `admin`. |

Each user belongs to one company. Templates, snaps, forms and tokens belong to the company of the user.

## Create the owner

The first account of an instance is the owner. Create it in one of two ways:

- **The setup page.** Open `/setup?token=<token>`. Run `php artisan snapsbrew:setup-url` to show the full URL. The Docker `web` container also prints it to its log.
- **The command line.** Run `php artisan snapsbrew:install`. The command asks for the name, the email and the password. You can also give `--name`, `--email`, `--password` and `--company`.

The setup page is open only while the `users` table is empty. While no user exists, `/`, `/login` and `/register` send the visitor to `/setup`. After the first account exists, `/setup` returns 404.

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

1. Open **Account > Users**.
2. Type the email of the person.
3. Send the invitation.

The app sends an email with a link to `/register?invitation=<token>`. The invitation expires after 7 days. The app refuses a second invitation while the first one is pending. It also refuses an email that is already a member of the company.

The invitation email needs a working mailer. If `MAIL_MAILER` is `log`, the email and its link go to the log. Read [Configuration](configuration.md).

New users also see an onboarding page. It can send up to 25 invitations at one time. The onboarding steps close when the user finishes onboarding.

One company can send 20 invitation emails in 24 hours, from the account page and the onboarding page together. `SNAPSBREW_INVITATIONS_PER_COMPANY_PER_DAY` changes this number.

## The admin area

Only the owner can open `/admin`. Every other visitor, a guest included, gets a 404.

| Page | What it does |
|---|---|
| **Admin > Users** (`/admin/users`) | Lists every account of the instance, with a search by name or email. Deactivates, reactivates and deletes users. |
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
