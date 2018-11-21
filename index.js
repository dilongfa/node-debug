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

start(process.env.DEBUG)

module.exports = exports = (namespace, color) => {
    let previous
 
    debug.namespace = namespace
    debug.color = color ? color : getColor()
    debug.enabled = getState(namespace)
    debug.sub = sub

    function debug(...args) {
        if (!debug.enabled) return
        
        const self = debug

        const c = self.color
        const now = Date.now()
        const duration = now - (previous || now)
        previous = now 
    
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
                    args[i] = (args[i] instanceof Error) ? args[i].stack || args[i].message : inspect(args[i], false, null, true)
                break
            }
        }
    
        const prefix = `\u001b[3${c};1m${self.namespace} \u001b[0m`
        let str = `  ${prefix}`
            str += format(...args).split('\n').join('\n  ' + prefix)
            str += ` \u001b[3${c}m+` + ms(duration) + `\u001b[0m`
    
        process.stderr.write(str + '\n')
    }

    return debug
}

//Support colors: white|grey|black|blue|cyan|green|magenta|red|yellow
function sub(namespace, color = '') {
    color = (color === '') ? '3'+this.color : inspect.colors[color][0]
    return exports(`${this.namespace}\u001b[${color};1m:${namespace}\u001b[0m`, this.color);
}
