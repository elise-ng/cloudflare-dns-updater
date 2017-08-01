let request = require('request')
let config = require('./config.json')
if (!config.hostname || !config.email || !config.token) {
  console.log('Config missing. Please fill in config file.')
  process.exit()
}
const CFAuthHeader = {
  'X-Auth-Email': config.email,
  'X-Auth-Key': config.token
}
// Get Public IP
let req = {
  url: 'https://api.ipify.org?format=json',
  json: true
}
request.get(req, (error, response, body) => {
  if (error) {
    console.log('Error getting public ip address: ', error)
    process.exit()
  }
  if (response.statusCode < 200 && response.statusCode > 299) {
    console.log(`Error getting public ip address: HTTP Error ${response.statusCode}`)
    process.exit()
  }
  let myIP = body['ip']
  console.log(`Public IP Address: ${myIP}`)
  // Get Zone ID
  let req = {
    method: 'GET',
    url: `https://api.cloudflare.com/client/v4/zones?name=${encodeURI(`${config.hostname.split('.').reverse()[1]}.${config.hostname.split('.').reverse()[0]}`)}`,
    headers: CFAuthHeader,
    json: true
  }
  request(req, (error, response, body) => {
    if (error) {
      console.log('Error getting Zone ID: ', error)
      process.exit()
    }
    if (response.statusCode < 200 && response.statusCode > 299) {
      console.log(`Error getting Zone ID: HTTP Error ${response.statusCode}`)
      process.exit()
    }
    if (body['result'].length === 0) {
      console.log('Error: Zone not found')
      process.exit()
    }
    let zoneID = body['result'][0]['id']
    console.log(`Zone ID: ${zoneID}`)
    // Get DNS Record ID
    let req = {
      method: 'GET',
      url: `https://api.cloudflare.com/client/v4/zones/${encodeURI(zoneID)}/dns_records?name=${encodeURI(config.hostname)}`,
      headers: CFAuthHeader,
      json: true
    }
    request(req, (error, response, body) => {
      if (error) {
        console.log('Error getting DNS record id: ', error)
        process.exit()
      }
      if (response.statusCode < 200 && response.statusCode > 299) {
        console.log(`Error getting DNS record id: HTTP Error ${response.statusCode}`)
        process.exit()
      }
      if (body['result'].length === 0) {
        console.log('Error: DNS record not found, have you set up your hostname on CloudFlare yet?')
        process.exit()
      }
      let recordID = body['result'][0]['id']
      console.log(`DNS Record ID: ${recordID}`)
      // Update DNS Record
      let req = {
        method: 'PUT',
        url: `https://api.cloudflare.com/client/v4/zones/${encodeURI(zoneID)}/dns_records/${encodeURI(recordID)}`,
        postData: {
          mimeType: 'application/json',
          params: [
            {
              'name': 'type',
              'value': 'A'
            },
            {
              'name': 'name',
              'value': `${config.hostname}.${config.domain}`
            },
            {
              'name': 'content',
              'value': myIP
            }
          ]
        },
        json: true
      }
      request(req, (error, response, body) => {
        if (error) {
          console.log('Error updating DNS record: ', error)
          process.exit()
        }
        if (response.statusCode < 200 && response.statusCode > 299) {
          console.log(`Error updating DNS record: HTTP Error ${response.statusCode}`)
          process.exit()
        }
        console.log('DNS Record updated successfully.')
      })
    })
  })
})
