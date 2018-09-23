Cloudflare DNS Updater
===
NodeJS Script for updating CloudFlare DNS record of servers with dynamic IP.

## Getting Started
### Dependencies
* axios
* public-ip

Install everything with `npm install`

### Configurations
Fill in your hostname, email and api token in `config.json`

#### Sample JSON
```json
{
  "hostname": "homelab.example.com",
  "email": "user@example.com",
  "token": "c2547eb745079dac9320b638f5e225cf483cc5cfdda41"
}
```

## Usage
```
node index.js
```
You may use crontab to schedule updates: (every 15 minutes in sample below)
```
*/15 * * * * /usr/local/bin/node /path/to/repo/index.js
```
