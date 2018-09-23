const axios = require('axios')
const publicIp = require('public-ip')
const config = require('./config.json')

async function main () {
  try {
    // Load Config
    if (!config.hostname || !config.email || !config.token) { throw Error('Config missing') }
    const cfAuthHeaders = {
      'X-Auth-Email': config.email,
      'X-Auth-Key': config.token
    }

    // Get Public IP and Zone ID
    const cfZoneIdReqUrl = `https://api.cloudflare.com/client/v4/zones?name=${encodeURI(`${config.hostname.split('.').reverse()[1]}.${config.hostname.split('.').reverse()[0]}`)}`
    const [ip, cfZoneIdRes] = await Promise.all([publicIp.v4(), axios.get(cfZoneIdReqUrl, { headers: cfAuthHeaders })])
    console.log('Public IP: ', ip)
    if (cfZoneIdRes.data.result.length <= 0) { throw Error('Zone not found') }
    const cfZoneId = cfZoneIdRes.data.result[0].id
    console.log('Zone ID: ', cfZoneId)

    // Get DNS Record ID
    const cfDnsIdReqUrl = `https://api.cloudflare.com/client/v4/zones/${encodeURI(cfZoneId)}/dns_records?name=${encodeURI(config.hostname)}`
    const cfDnsIdRes = await axios.get(cfDnsIdReqUrl, { headers: cfAuthHeaders })
    if (cfDnsIdRes.data.result.length <= 0) { throw Error('DNS record not found') }
    const cfDnsId = cfDnsIdRes.data.result[0].id
    console.log('DNS Record ID: ', cfDnsId)

    // Update DNS Record
    const cfPutReqUrl = `https://api.cloudflare.com/client/v4/zones/${encodeURI(cfZoneId)}/dns_records/${encodeURI(cfDnsId)}`
    const cfPutReqData = {
      'type': 'A',
      'name': config.hostname,
      'content': ip
    }
    const cfPutRes = await axios.put(cfPutReqUrl, cfPutReqData, { headers: cfAuthHeaders })
    if (cfPutRes.data.success === true) {
      console.log('DNS Record update success: ', JSON.stringify(cfPutRes.data, undefined, 2))
    } else {
      console.error('DNS Record update failed: ', JSON.stringify(cfPutRes.data.errors, undefined, 2))
    }
  } catch (e) {
    console.error(e)
  }
}

// entry
main()
