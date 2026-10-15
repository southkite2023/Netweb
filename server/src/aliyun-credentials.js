import CredentialPackage from '@alicloud/credentials'
import RPCClient from '@alicloud/pop-core'

export function credentialsConfigured(env = process.env) {
  return env.ALIBABA_CLOUD_CREDENTIALS_TYPE === 'ecs_ram_role' || !!(env.ALIBABA_CLOUD_ACCESS_KEY_ID && env.ALIBABA_CLOUD_ACCESS_KEY_SECRET)
}
export function createCredentialProvider(env = process.env) {
  const Credential = CredentialPackage.default || CredentialPackage
  if (env.ALIBABA_CLOUD_CREDENTIALS_TYPE === 'ecs_ram_role') {
    return new Credential(new CredentialPackage.Config({ type:'ecs_ram_role', roleName:env.ALIBABA_CLOUD_ECS_METADATA || undefined, disableIMDSv1:true, timeout:5000, connectTimeout:3000 }))
  }
  if (!credentialsConfigured(env)) throw new Error('Alibaba Cloud credentials are not configured')
  return new Credential(new CredentialPackage.Config({ type:env.ALIBABA_CLOUD_SECURITY_TOKEN ? 'sts' : 'access_key', accessKeyId:env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret:env.ALIBABA_CLOUD_ACCESS_KEY_SECRET, securityToken:env.ALIBABA_CLOUD_SECURITY_TOKEN || undefined }))
}
let provider
export async function aliyunRpc(endpoint, apiVersion, action, params, dependencies = {}) {
  const source = dependencies.provider || (provider ||= createCredentialProvider())
  // Ask the singleton Credentials SDK on every request; it caches and refreshes expiring STS credentials.
  const credential = await source.getCredential()
  if (!credential?.accessKeyId || !credential.accessKeySecret) throw new Error('Alibaba Cloud credential unavailable')
  const Client = dependencies.Client || RPCClient
  const client = new Client({ accessKeyId:credential.accessKeyId, accessKeySecret:credential.accessKeySecret,
    securityToken:credential.securityToken, endpoint:`https://${endpoint}`, apiVersion, opts:{timeout:10000} })
  return client.request(action,params,{method:'POST'})
}
