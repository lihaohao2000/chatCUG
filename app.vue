<script setup lang="ts">
  useSeoMeta({
    description: 'CUSGGPT是中国联通国际公司新加坡分公司内部使用的定制化语言模型平台。'
  })
  await $fetch(`/api/init/`);
</script>
<template>
  <div class="h-full">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
