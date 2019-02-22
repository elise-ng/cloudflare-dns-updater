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
        'content': content
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
