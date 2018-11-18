'use strict'

const { inspect, format } = require('util')

const allows = []
const ignores = []
const colors = [2, 3, 4, 5, 6]
let instanceCounter = 0

function ms(ms) {
    if (ms >= 86400000) return Math.round(ms / 86400000) + 'd'
    if (ms >= 3600000)  return Math.round(ms / 3600000) + 'h'
    if (ms >= 60000)    return Math.round(ms / 60000) + 'm'
    if (ms >= 1000)     return Math.round(ms / 1000) + 's'
    return ms + 'ms'
}

function getColor() {
    const c = (instanceCounter % colors.length)
    instanceCounter++
    return (c === 0) ? 2 : 2+c
}

function getState(ns) {
    if (process.env.DEBUG === '*') {
        return true
    }

    for (let elm of ignores) {
        if (elm.test(ns)) return false
    }

    for (let elm of allows) {
        if (elm.test(ns)) return true
    }

    return false
}

function start(ns = '') {
    if (ns === '') ns = process.env.DEBUG
    const ary = ns.split(/[\s,]+/)
    for (let elm of ary) { 
        if (!elm) continue
        ns = elm.replace(/\*/g, '.*?')
        if (ns[0] === '-') {
            ignores.push(new RegExp('^' + ns.slice(1) + '$'))
        } else {
            allows.push(new RegExp('^' + ns + '$'))
        }
    }
}

function Debug(namespace) {
    this.namespace = namespace
    this.color = getColor()
    this.previous = null
    this.enabled = getState(namespace)

    return this.debug.bind(this)
}

Debug.prototype.debug = function(...args) {
   if (!this.enabled || args.length === 0) return
    
    const c = this.color
    const now = Date.now()
    const duration = now - (this.previous || now)
    this.previous = now 

    // Parse and reformat messages
    if (typeof args[0] !== 'string') {
        args.unshift('%s')
    } else {
        args[0] = args[0].replace(/%([oO])/g, '%s')
    }

    for(let i = 1; i < args.length; i++) {
        switch(typeof args[i]) {
            case 'function':
                args[i] = args[i].toString()
                break
                case 'object':
                args[i] = (args[i] instanceof Error) ? args[i].stack.replace(/   at /g, '@ ') : inspect(args[i], false, null, true)
            break
        }
    }

    const prefix = `\u001b[3${c};1m${this.namespace} \u001b[0m`
    let str = `  ${prefix}`
        str += format(...args).split('\n').join('\n  ' + prefix)
        str += ` \u001b[3${c}m+` + ms(duration) + `\u001b[0m`

    // Output
    process.stderr.write(str + '\n')
}

start()

module.exports = (namespace) => new Debug(namespace)
