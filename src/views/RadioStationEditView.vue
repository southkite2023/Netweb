<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PrivacyNotice from '../components/PrivacyNotice.vue'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const error = ref('')
const success = ref('')
const busy = ref(false)
const profile = ref(null)
const form = ref({ callsign: '', operatorClass: 'C', callsignCountry: 'CN', qth: '', rig: '', antenna: '', defaultPowerW: '', bio: '' })
const copy = computed(() => ({
  zh: { kicker: '// RADIO IDENTITY', title: '我的电台', intro: '呼号会成为你在 Yuashie Radio 中的公开无线电身份，并在用户名旁同步显示 📻 呼号标识。', callsign: '呼号', cls: '操作技术能力类别', country: '呼号国家/地区代码', qth: '默认 QTH', rig: '常用设备', antenna: '常用天线', power: '默认功率（W）', bio: '无线电简介', save: '保存电台资料', saved: '电台资料已保存。', hint: '呼号会统一转换为大写；同一呼号只能绑定一个 Yuashie 账号。当前版本为“已绑定 / 未验证”，后续可扩展执照验证。', public: '查看公开电台主页' },
  en: { kicker: '// RADIO IDENTITY', title: 'My Station', intro: 'Your callsign becomes your public radio identity on Yuashie Radio and is shown beside your account with the 📻 mark.', callsign: 'Callsign', cls: 'Operator class', country: 'Callsign country code', qth: 'Default QTH', rig: 'Rig', antenna: 'Antenna', power: 'Default power (W)', bio: 'Radio bio', save: 'SAVE STATION', saved: 'Station profile saved.', hint: 'Callsigns are normalized to uppercase. One callsign can belong to only one Yuashie account. The current release supports bound/unverified status; licence verification can be added later.', public: 'VIEW PUBLIC STATION' },
  ja: { kicker: '// RADIO IDENTITY', title: 'マイ無線局', intro: 'コールサインはYuashie Radio上の公開無線IDとなり、ユーザー名の横に📻マーク付きで表示されます。', callsign: 'コールサイン', cls: '操作技術クラス', country: 'コールサイン国コード', qth: '既定QTH', rig: '無線機', antenna: 'アンテナ', power: '既定出力（W）', bio: '無線プロフィール', save: '無線局情報を保存', saved: '無線局情報を保存しました。', hint: 'コールサインは大文字に統一され、1つのコールサインは1アカウントのみ登録できます。現バージョンは登録済み・未認証で、免許確認は後から拡張できます。', public: '公開無線局ページを見る' },
}[locale.value]))

async function load() {
  error.value = ''
  try {
    const result = await api.radioMe()
    profile.value = result.profile
    if (result.profile) form.value = {
      callsign: result.profile.callsign, operatorClass: result.profile.operatorClass, callsignCountry: result.profile.callsignCountry || 'CN',
      qth: result.profile.qth || '', rig: result.profile.rig || '', antenna: result.profile.antenna || '',
      defaultPowerW: result.profile.defaultPowerW ?? '', bio: result.profile.bio || '',
    }
  } catch (e) { error.value = e.message }
}

async function save() {
  busy.value = true; error.value = ''; success.value = ''
  try {
    const result = await api.updateRadioProfile(form.value)
    profile.value = result.profile
    auth.user = result.user
    form.value.callsign = result.profile.callsign
    success.value = copy.value.saved
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <div class="radio-page"><div class="container"><SiteNav/><RadioSubnav/>
    <main class="radio-main radio-form-main">
      <header class="radio-hero compact"><p class="auth-kicker">{{ copy.kicker }}</p><h1>{{ copy.title }}</h1><p>{{ copy.intro }}</p></header>
<PrivacyNotice kind="radioProfile" />
      <p v-if="error" class="form-error">{{ error }}</p><p v-if="success" class="form-success">{{ success }}</p>
      <section class="radio-form-panel">
        <div class="radio-form-grid">
          <label><span>{{ copy.callsign }}</span><input v-model.trim="form.callsign" maxlength="20" placeholder="BG8XXX" @input="form.callsign = form.callsign.toUpperCase()"></label>
          <label><span>{{ copy.cls }}</span><select v-model="form.operatorClass"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></label>
          <label><span>{{ copy.country }}</span><input v-model.trim="form.callsignCountry" maxlength="2" placeholder="CN" @input="form.callsignCountry = form.callsignCountry.toUpperCase()"></label>
          <label><span>{{ copy.power }}</span><input v-model="form.defaultPowerW" type="number" min="0" step="0.1" placeholder="20"></label>
          <label><span>{{ copy.qth }}</span><input v-model="form.qth" maxlength="120" placeholder="Sichuan, China"></label>
          <label><span>{{ copy.rig }}</span><input v-model="form.rig" maxlength="120" placeholder="ICOM IC-7300"></label>
          <label class="wide"><span>{{ copy.antenna }}</span><input v-model="form.antenna" maxlength="160" placeholder="PAC-12"></label>
          <label class="wide"><span>{{ copy.bio }}</span><textarea v-model="form.bio" maxlength="500" rows="5"></textarea></label>
        </div>
        <p class="form-hint">{{ copy.hint }}</p>
        <div class="radio-form-actions"><button class="primary-action" :disabled="busy" @click="save">{{ copy.save }}</button><RouterLink v-if="profile" class="secondary-action" :to="`/radio/${profile.callsign}`">{{ copy.public }} →</RouterLink></div>
      </section>
    </main>
  </div><SiteFooter/></div>
</template>
