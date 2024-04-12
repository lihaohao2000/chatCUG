<script setup>
const route = useRoute()

const links = [
  [{
    label: '聊天助手',
    icon: 'i-heroicons-pencil-square',
    to: '/'
  }, {
    label: '知识库',
    icon: 'i-heroicons-book-open',
    to: '/knowledgebases'
  }], [{
    label: 'CUSGGPT',
    labelClass: 'text-2xl font-semibold text-primary'
  }]
]
</script>
<template>
  <UHorizontalNavigation :links="links" class="border-b border-gray-200 dark:border-gray-800" />

  <div id="main" class="p-4 box-border overflow-auto" style="height: calc(100% - 61px)">
    <slot />
  </div>
  <UNotifications />
</template>
