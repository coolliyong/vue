# 源码阅读

## 1.找到入口

首先通过`package.json`了解其依赖和其`script`命令
找到一个打包命令`"build": "node scripts/build.js",`
然后去看`script/build.js`
....
最后找到 `rollup`打包入口

```js
 // Runtime only ES modules build (for bundlers)
'web-runtime-esm': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.esm.js'),
    format: 'es',
    banner
  },
```

## 2.从入口解读

- `src/platforms/web/entry-runtime.js`

```js
import Vue from './runtime/index'
export default Vue
```

- `src/platforms/web/entry-runtime.js`

```js
import Vue from 'core/index'
// ...
// 下面代码 对原型上的方法进行了挂载，此时先忽略，整理出主线
```

- `src/core/index.js`

```js
import Vue from './instance/index'
import {initGlobalAPI} from './global-api/index'
initGlobalAPI(Vue) // 初始化全局API
// ... 挂载
export default Vue
```

- `src/core/instance/index.js`  
  先声明 VUE 构造函数，然后值传递，在其他函数内部中挂载方法

```js
import {initMixin} from './init'
import {stateMixin} from './state'
import {renderMixin} from './render'
import {eventsMixin} from './events'
import {lifecycleMixin} from './lifecycle'
import {warn} from '../util/index'

function Vue(options) {
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```

## 3.`initMixin`

挂载一个 `_init`方法

- 'src/core/instance/index.js

```js
export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function(options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // 一个用来避免被观察的标志
    vm._isVue = true
    // 合并选项
    if (options && options._isComponent) {
      // 优化内部组件实例化
      // 因为动态选项合并非常慢，而且没有
      // 内部组件选项需要特殊处理
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      // 挂载方法
      vm.$mount(vm.$options.el)
    }
  }
}
```

## 4. new Vue

首先传入一个 对象 `{ el: '#app', router, store, template: '<App/>', components: { App } }`

### VUE 根实例

![VUE根实例](./imgs/vue_instance.jpg)

### VUE Compoent 实例

隐式原型指向 VUE 实例
![VUE根实例](./imgs/vue_instance.jpg)
