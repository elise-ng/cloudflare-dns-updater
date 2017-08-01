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
var myIP = ''
var zoneID = ''
var recordID = ''
// Get Public IP
let getPublicIP = new Promise((resolve, reject) => {
  let req = {
    url: 'https://api.ipify.org?format=json',
    json: true
  }
  request.get(req, (error, response, body) => {
    if (error) {
      console.log('Error getting public ip address: ', error)
      reject()
    }
    if (response.statusCode < 200 && response.statusCode > 299) {
      console.log(`Error getting public ip address: HTTP Error ${response.statusCode}`)
      reject()
    }
    myIP = body['ip']
    console.log(`Public IP Address: ${myIP}`)
    resolve()
  })
})

let getIDs = new Promise((resolve, reject) => {
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
      reject()
    }
    if (response.statusCode < 200 && response.statusCode > 299) {
      console.log(`Error getting Zone ID: HTTP Error ${response.statusCode}`)
      reject()
    }
    if (body['result'].length === 0) {
      console.log('Error: Zone not found')
      reject()
    }
    zoneID = body['result'][0]['id']
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
        reject()
      }
      if (response.statusCode < 200 && response.statusCode > 299) {
        console.log(`Error getting DNS record id: HTTP Error ${response.statusCode}`)
        reject()
      }
      if (body['result'].length === 0) {
        console.log('Error: DNS record not found, have you set up your hostname on CloudFlare yet?')
        reject()
      }
      recordID = body['result'][0]['id']
      console.log(`DNS Record ID: ${recordID}`)
      resolve()
    })
  })
})

Promise.all([getPublicIP, getIDs]).then(result => {
  // Update DNS Record
  let req = {
    method: 'PUT',
    url: `https://api.cloudflare.com/client/v4/zones/${encodeURI(zoneID)}/dns_records/${encodeURI(recordID)}`,
    headers: CFAuthHeader,
    json: {
      'type': 'A',
      'name': config.hostname,
      'content': myIP
    }
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
    if (body['success']) {
      console.log('DNS Record updated successfully.')
    } else {
      console.log('Error updating DNS record: ', body['errors'][0]['message'])
    }
  })
}).catch(error => {
  console.log('Fatal error occured. Exiting...')
})
