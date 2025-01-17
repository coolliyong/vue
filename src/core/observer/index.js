/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 * 在某些情况下，我们可能想在组件的更新计算中禁用观察。
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}


/**
 * 附加到每个被观察对象的观察者类
 * 对象。一旦附加，观察者将转换目标
 * 对象的属性键转换为getter/setter
 * 收集依赖项并分派更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // 将此对象作为根$data的vm数量

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // object.defineproperty(value,'__ob__',this)


    // value = target
    // this: Observer Instance
    def(value, '__ob__', this);
    // eslint-disable-next-line
    // // debugger;
    if (Array.isArray(value)) {
      // // debugger;
      // 数组处理
      if (hasProto) { // '__proto__' in {}
        // 修改数组原型
        protoAugment(value, arrayMethods)
      } else {
        // def(value, arrayMethods, ...arrayKeys) // 给数据keys 统一加一个订阅
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // observe() 数组的每一项
      this.observeArray(value)
    } else {
      // 对象的处理
      this.walk(value)
      // const keys = Object.keys(value)
      // defineReactive(obj, ...keys)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * 通过截取来扩充目标对象或数组
 * 使用……proto__的原型链
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * 尝试为值创建一个观察者实例，
 * 如果成功观察到，返回新的观察者，
 * 或现有的观察者，如果值已经有一个。
 * value 观察者源 是否根节点  返回 ovserver 或 void
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果不是对象或者 源 是 vnode 则直接返回
  if (!isObject(value) || value instanceof VNode) return
  let ob: Observer | void
  // 如果存在于响应式 对象 则直接赋值
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 需要更新 && 非服务端渲染
    // 数组 或者 普通对象
    // 对象是否是可拓展
    // 非Vue 对象
    shouldObserve && !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 在对象上定义反应性属性。
 * // obj key  value 自定义设置函数 是否浅层对象
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()
  /***
   * Object.getOwnPropertyDescriptor()
   * 返回对象上一个自有属性对应的属性描述符。
   *（自有属性指的是直接赋予该对象的属性，不需要从原型链上进行查找的属性）
   */
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
    // 如果不能被改变，直接 void
  }

  // cater for pre-defined getter/setters
  // 满足预定义的getter/setter
  const getter = property && property.get
  const setter = property && property.set
  // 如果没有给val 返回 原 val
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 是否是 非浅层 且直接 创建一个响应式 对象
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 如果有 watch 触发watch
        dep.depend();
        // 每一个来 defineReactive 的target 都闭包了 一个dep,里面记录了谁来这里用到了这个值。
        if (childOb) { // 如果是深层级，给 深层级的对象也触发 发布
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 数组递归触发 发布
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 原值
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 值不变 不做变更
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果是深层级 ，再做一下响应式处理，如果有原响应对象，则 VMCount ++
      childOb = !shallow && observe(newVal)
      dep.notify() // 给订阅者 发布
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
