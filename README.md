# Chubby
Discord moderation bot for Pretendo

Features:

- `/warn` command for warning users. Supports multiple users per warning. 3 warnings results in a kick. 4 warnings results in a ban
- `/kick` command for kicking users. Supports multiple users per kick. 3 kicks results in a ban
- `/ban` command for banning users. Supports multiple users per warning
- NSFW content detection

Requirements:

- Linux OS
- At least 4096mb available memory

As we rely on the `phhammdist` extension for Sqlite3 (which is included in `lib/phhammdist`) currently this only supports Linux