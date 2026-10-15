<script setup>
import { nextTick, onMounted, onBeforeUnmount, ref, useId } from 'vue'
const props = defineProps({ config:Object, disabled:Boolean, label:{ type:String, default:'安全验证' } })
const emit = defineEmits(['verified'])
const suffix = useId().replace(/[^a-zA-Z0-9]/g,'')
const element = `captcha-${suffix}`, button = `captcha-button-${suffix}`
const error = ref(''), ready = ref(false)
let instance, alive = true
async function initialize() {
  if (!props.config || !alive) return
  instance?.destroy?.(); instance = null
  ready.value = false
  error.value = ''
  try {
    window.AliyunCaptchaConfig = { region:props.config.region, prefix:props.config.prefix }
    if (!window.__yuashieCaptchaLoad) window.__yuashieCaptchaLoad = new Promise((resolve,reject) => {
      if (window.initAliyunCaptcha) return resolve()
      const script = document.createElement('script')
      script.src = 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'
      script.onload = resolve
      script.onerror = () => { window.__yuashieCaptchaLoad = null; script.remove(); reject(new Error('安全验证加载失败，请刷新重试。')) }
      document.head.append(script)
    })
    await window.__yuashieCaptchaLoad
    if (!alive) return
    await nextTick()
    window.initAliyunCaptcha({ SceneId:props.config.sceneId, mode:'popup', element:`#${element}`, button:`#${button}`,
      success: token => { if (alive && !props.disabled) emit('verified',token) },
      getInstance: value => { instance = value; if (alive) ready.value = true },
      onError: () => { error.value = '安全验证暂时不可用，请刷新重试。' },
    })
  } catch(e) { error.value = e.message }
}
onMounted(initialize)
onBeforeUnmount(() => { alive = false; instance?.destroy?.() })
defineExpose({ reset:initialize })
</script>
<template>
  <div :id="element"></div>
  <button :id="button" type="button" class="account-secondary" :disabled="disabled || !config || !ready">{{ ready ? label : config ? '加载安全验证…' : '安全验证待配置' }}</button>
  <p v-if="error" role="alert" class="form-error">{{ error }}</p>
</template>
