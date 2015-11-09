import curryN from 'ramda/src/curryN'

const isString = s => typeof s === 'string'
const isNumber = n => typeof n === 'number'
function isObject(value) {
  const type = typeof value
  return !!value && (type == 'object' || type == 'function')
}
const isFunction = f => typeof f === 'function'
const isArray = Array.isArray || (a => 'length' in a)

const mapConstrToFn = curryN(2, function(group, constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : constr === Function  ? isFunction
       : constr === undefined ? group
                              : constr
})

function Constructor(group, name, validators) {
  validators = validators.map(mapConstrToFn(group))
  const constructor = curryN(validators.length, function() {
    var val = [], v, validator
    for (var i = 0; i < arguments.length; ++i) {
      v = arguments[i]
      validator = validators[i]
      if ((typeof validator === 'function' && validator(v)) ||
          (v !== undefined && v !== null && v.of === validator)) {
        val[i] = arguments[i]
      } else {
        throw new TypeError('wrong value ' + v + ' passed to location ' + i + ' in ' + name)
      }
    }
    val.of = group
    val.name = name
    return val
  })
  return constructor
}

function rawCase(type, cases, action, arg) {
  if (type !== action.of) throw new TypeError('wrong type' + JSON.stringify(type) + ' passed to case' + JSON.stringify(cases))
  const name = action.name in cases ? action.name
           : '_' in cases         ? '_'
                                  : undefined
  if (name === undefined) {
    throw new Error('unhandled value passed to case')
  } else {
    return cases[name].apply(undefined, arg !== undefined ? action.concat([arg]) : action)
  }
}

const typeCase = curryN(3, rawCase)
const caseOn = curryN(4, rawCase)

function Type(desc) {
  const obj = {}
  for (var key in desc) {
    obj[key] = Constructor(obj, key, desc[key])
  }
  obj.case = typeCase(obj)
  obj.caseOn = caseOn(obj)
  return obj
}

module.exports = Type
