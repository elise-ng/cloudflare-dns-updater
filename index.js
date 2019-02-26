const fs = require('fs');
const axios = require('axios')
const publicIp = require('public-ip')

function loadConfig() {
  // Guarantee that config.json exists. If it doesn't, create it, and tell the
  // user to edit it.
  try {
    fs.accessSync('./config.json', fs.constants.R_OK);
  } catch(err) {
    fs.copyFileSync('./config.json.sample', './config.json');
    console.log("Please set your options in config.json.");
    process.exit();
  }

  // Make sure the configuration object has all the properties and values we
  // need it to have.
  const config = require('./config.json')
  if (typeof config.hostname !== 'string') {
    throw Error("Misconfigured: config.json must have a 'hostname' string");
  }
  if (typeof config.email !== 'string') {
    throw Error("Misconfigured: config.json must have an 'email' string");
  }
  if (typeof config.token !== 'string') {
    throw Error("Misconfigured: config.json must have a 'token' string");
  }
  if (typeof config.proxied !== 'boolean') {
    throw Error("Misconfigured: config.json must have a 'proxied' boolean");
  }
  return config;
}

async function main () {
  try {
    const config = loadConfig();

    const cfAuthHeaders = {
      'X-Auth-Email': config.email,
      'X-Auth-Key': config.token
    }

    // Get Zone ID
    const cfZoneIdReqUrl = `https://api.cloudflare.com/client/v4/zones?name=${encodeURI(`${config.hostname.split('.').reverse()[1]}.${config.hostname.split('.').reverse()[0]}`)}`
    const cfZoneIdRes = await axios.get(cfZoneIdReqUrl, { headers: cfAuthHeaders })
    if (cfZoneIdRes.data.result.length <= 0) { throw Error('Zone not found') }
    const cfZoneId = cfZoneIdRes.data.result[0].id
    console.log('Zone ID: ', cfZoneId)

    // Get DNS Record ID
    const cfDnsIdReqUrl = `https://api.cloudflare.com/client/v4/zones/${encodeURI(cfZoneId)}/dns_records?name=${encodeURI(config.hostname)}`
    const cfDnsIdRes = await axios.get(cfDnsIdReqUrl, { headers: cfAuthHeaders })
    if (cfDnsIdRes.data.result.length <= 0) { throw Error('DNS record not found') }
    const results = await Promise.all(cfDnsIdRes.data.result.map(async cfDnsRecord => {
      console.log('DNS Record ID: ', cfDnsRecord.id)
      let content
      switch (cfDnsRecord.type) {
        case 'A':
          content = await publicIp.v4()
          break
        case 'AAAA':
          content = await publicIp.v6()
          break
        default:
          console.error(`DNS Record Type unsupported: ${cfDnsRecord.type}`)
          return
      }
      // Update DNS Record
      const cfPutReqUrl = `https://api.cloudflare.com/client/v4/zones/${encodeURI(cfZoneId)}/dns_records/${encodeURI(cfDnsRecord.id)}`
      const cfPutReqData = {
        'type': cfDnsRecord.type,
        'name': cfDnsRecord.name,
        'content': content,
        'proxied': config.proxied
      }
      return axios.put(cfPutReqUrl, cfPutReqData, { headers: cfAuthHeaders })
    }))
    results.forEach(result => {
      if (!result || !result.data) {
        console.error(`Warning: null result received, see above for error messages`)
        return
      }
      if (result.data.success === true) {
        console.log(`DNS Record update success: `, JSON.stringify(result.data, undefined, 2))
      } else {
        console.error(`DNS Record update failed: `, JSON.stringify(result.data.errors, undefined, 2))
      }
    })
  } catch (e) {
    console.error(e)
  }
}

// entry
main()
