---
title: Recover access
description: Reset a password or turn off two-factor authentication from the command line, without email.
order: 9
---

# Recover access

The "forgot password" form sends an email. If your instance has no working mailer, or the owner cannot sign in, use the commands on this page.

With Docker, add `docker compose exec web` before each command. For example:

```bash
docker compose exec web php artisan snapsbrew:user:list
```

## Find the user

List the users of the instance:

```bash
php artisan snapsbrew:user:list
```

To show only the users whose name or email contains a text, add `--search`:

```bash
php artisan snapsbrew:user:list --search=person
```

The table shows the ID, the name, the email, the company, the owner flag and the creation date of each user.

## Set a new password

1. Run the command with the email of the user:

   ```bash
   php artisan snapsbrew:user:password person@example.com
   ```

2. Type the new password.
3. Type the new password again.

The command has these options:

| Option | What it does |
|---|---|
| `--password=<new password>` | Sets the password without a prompt. Use it in a script. |
| `--generate` | Makes a random password of 32 characters with no symbols. The command shows it one time. |
| `--reset-two-factor` | Turns off two-factor authentication for a user who lost the device. |

You cannot use `--password` and `--generate` together. If the command cannot prompt, for example in a script, give `--password` or `--generate`.

The new password must obey the same rules as the web form.

CAUTION: A password in `--password` goes into the shell history. Use the prompt or `--generate` when you can.

## What the command also does

- It ends the "Remember me" logins of the user.
- With the `database` session driver, it removes the web sessions of the user.
- With other session drivers, each web session of the user ends at its next request, because the password changed.
- With `--reset-two-factor`, it removes the two-factor secret and the recovery codes. The user can turn on two-factor authentication again in **Account > Security**.

The command does not change the API tokens of the user. To stop the tokens, delete them in **Account > Developers**, or deactivate the user. Read [Accounts and registration](accounts-and-registration.md).

## Lost the owner account

If nobody can sign in as the owner:

1. Find the owner with `php artisan snapsbrew:user:list`. The **Owner** column shows `yes`.
2. Set a new password with `php artisan snapsbrew:user:password <email>`.

If the owner account is gone, make another user the owner:

```bash
php artisan snapsbrew:install --promote=person@example.com
```

## Lost the setup URL

While the instance has no account, show the setup URL again:

```bash
php artisan snapsbrew:setup-url
```

If an account exists, the command says that the setup page is closed.
