Cloudflare DNS Updater
===
NodeJS Script for updating CloudFlare DNS record of servers with dynamic IP.
## Dependencies
* axios
* public-ip
## Usage
### Setup
```sh
$ git clone git@github.com:chihimng/cloudflare-dns-updater.git
$ cd cloudflare-dns-updater
$ npm install
```
### Configuration
Fill in your hostname and api key in `config.json`
Generate an api key at [API Tokens Page](https://dash.cloudflare.com/profile/api-tokens), select Zone DNS Edit permission
#### Sample JSON
```json
{
  "hostname": "homelab.example.com",
  "bearerToken": "..."
}
```

In legacy versions we used the global api key to authenticate with Cloudflare API, see [the legacy sample here](./config.json.legacy.sample)

### Run
```sh
$ node index.js
```
### Schedule auto updates
You may use crontab to schedule updates: (every 15 minutes in sample below)
```
*/15 * * * * /usr/local/bin/node /path/to/repo/index.js
```
