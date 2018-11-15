'use strict'

const util = require('util')
const allows = []
const ignores = []
const colors = [2, 3, 4, 5, 6]
let counter = 0

function ms(ms) {
    if (ms >= 86400000) return Math.round(ms / 86400000) + 'd'
    if (ms >= 3600000)  return Math.round(ms / 3600000) + 'h'
    if (ms >= 60000)    return Math.round(ms / 60000) + 'm'
    if (ms >= 1000)     return Math.round(ms / 1000) + 's'
    return ms + 'ms'
}

function fillColor(str, c = 0) {
    return '\u001b[3' + c + ';1m' + str + '\u001b[0m'
}

function getColor() {
    let c = (counter % colors.length)
    counter++
    return (c === 0) ? 2 : 2+c
}

function formatError(e) {
    return e.stack.split('\n').map((str, i) => {
        if (i == 0) return e.message
        if (i == 1) return fillColor(str.replace('at', '@'), 0).replace(/\((.*)\)/,  fillColor('($1)', 1)) 
        return fillColor(str.replace('at', '@'), 0)
    }).join('\n')
}

const formatters = {
    o: (v) => util.inspect(v, {colors: true}).replace(/\s*\n\s*/g, ' '), //.split('\n').map(str => str.trim()).join('  '),
    O: (v) => (v instanceof Error) ? formatError(v) : util.inspect(v, {colors: true})
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

function load(ns) {
    if (!ns) ns = process.env.DEBUG

    let ary = (typeof ns === 'string' ? ns : '').split(/[\s,]+/)
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
    this._namespace = namespace
    this._color = getColor()
    this._previous = null
    this._enabled = getState(namespace)
    return this.debug.bind(this)
}

Debug.prototype.debug = function(...args) {
   if (!this._enabled || args.length === 0) return

    const now = Date.now()
    const duration = now - (this._previous || now)
    this._previous = now

    // Parse and reformat messages
    if (typeof args[0] !== 'string') {
        args.unshift('%O')
    } else if (args[1] instanceof Error && args[0].indexOf('%O') == -1) {
        args[0] = args[0].trim() + ' %O'
    }

    let idx = 0
    args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, flag) => {
        if (match === '%%') return match
        idx++
        if (typeof formatters[flag] == 'function' && args[idx]) {
            match = formatters[flag](args[idx])
            args.splice(idx, 1)
            idx--
        }
        return match 
    })

    const prefix = fillColor(this._namespace, this._color)
    const suffix = '\u001b[3' + this._color + 'm' + '+' + ms(duration) + '\u001b[0m'

    args[0] = '  ' + prefix + ' ' +args[0].split('\n').join('\n  ' + prefix)
    args.push(suffix)

    // Output
    process.stdout.write(util.format(...args) + '\n');
}

load()

module.exports = (namespace) => new Debug(namespace)
