<script setup lang="ts">
import { fetchHeadersOllama, fetchHeadersThirdApi } from '@/utils/settings'
import { type KnowledgeBaseFile } from '@prisma/client';

const toast = useToast()
const state = reactive({
  selectedFiles: '',
  name: '',
  embedding: '',
  description: '',
});

const validate = (data: typeof state) => {
  const errors = []
  if (!data.name) errors.push({ path: 'name', message: 'Required' })
  if (!data.embedding) errors.push({ path: 'embedding', message: 'Required' })
  return errors
}

const selectedFiles = ref([]);
const onFileChange = async (e: any) => {
  selectedFiles.value = e.target.files;
};
const loading = ref(false);
const onSubmit = async () => {
  loading.value = true;
  const formData = new FormData();
  Array.from(selectedFiles.value).forEach((file, index) => {
    console.log(`Index ${index}`, file);
    formData.append(`file_${index}`, file);
  });

  // formData.append("name", state.name);
  formData.append("description", state.description);
  // formData.append("embedding", state.embedding);

  try {
    await $fetch(`/api/knowledgebases/`, {
      method: 'POST',
      body: formData,
      headers: {
        ...fetchHeadersOllama.value,
        ...fetchHeadersThirdApi.value,
      }
    });
    reset()
    refresh();
  } catch (e: any) {
    const msg = e.response._data?.message || e.message;
    toast.add({ color: 'red', title: 'Tips', description: msg })
  }

  loading.value = false;
}

const { data, refresh } = await useFetch('/api/knowledgebases');

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'url', label: '文件名' },
  { key: 'description', label: '文件描述' },
  { key: 'created', label: '创建时间' },
  { key: 'actions' }
];

const knowledgeBaseFiles = computed(() => data.value?.knowledgeBaseFiles || []);

const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return date.toLocaleString(); // 根据需要使用其他格式化方式
};

const actionsItems = (row: KnowledgeBaseFile) => {
  return [[{
    label: 'Delete',
    icon: 'i-heroicons-trash-20-solid',
    click: () => onDelete(row.id)
  }]]
}

const onDelete = async (id: number) => {
  await $fetch(`/api/knowledgebases/${id}`, {
    method: 'DELETE',
    body: { id },
  });
  refresh();
}

function reset() {
  state.name = '';
  state.embedding = '';
  state.description = '';
  state.selectedFiles = '';
}
</script>

<template>
  <div class="flex flex-row w-full">
    <div class="px-6 w-[400px]">
      <h2 class="font-bold text-xl mb-4">上传文件到知识库</h2>
      <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
        <!-- <UFormGroup label="Name" name="name" required>
          <UInput type="text" v-model="state.name" />
        </UFormGroup>

        <UFormGroup label="Embedding" name="embedding" required>
          <UInput type="text" v-model="state.embedding" />
        </UFormGroup> -->

        <UFormGroup label="需要上传的文件" name="file">
          <UInput multiple type="file" size="sm" accept=".txt,.json,.md,.doc,.docx,.pdf" v-model="state.selectedFiles"
            @change="onFileChange" />
        </UFormGroup>

        <UFormGroup label="文件描述" name="description">
          <UTextarea autoresize :rows="2" v-model="state.description" />
        </UFormGroup>

        <UButton type="submit" :loading="loading">
          上传
        </UButton>
      </UForm>
    </div>
    <div class="flex flex-col flex-1 px-6">
      <h2 class="font-bold text-xl mb-4">知识库</h2>
      <ClientOnly>
        <UTable :columns="columns" :rows="knowledgeBaseFiles">
          <!-- <template #name-data="{ row }">
            <ULink :to="`/knowledgebases/${row.id}`"
              class="text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 underline text-wrap">
              {{ row.name }}
            </ULink>
          </template> -->

          <!-- <template #files-data="{ row }">
            <div class="inline-flex">
              <UPopover mode="hover" :popper="{ placement: 'right' }">
                <UButton color="gray" variant="soft" :label="'' + row.files.length" />
                <template #panel>
                  <ul class="p-2 list-inside">
                    <li v-for="el in row.files" :key="el.id" class="my-1">{{ el.url }}</li>
                  </ul>
                </template>
              </UPopover>
            </div>
          </template> -->



          <template #description-data="{ row }">
            <span class="text-wrap">{{ row.description }}</span>
          </template>

          <template #created-data="{ row }">
            <span>{{ formatDate(row.created) }}</span>
          </template>
          
          <template #actions-data="{ row }">
            <UDropdown :items="actionsItems(row)">
              <UButton color="gray" variant="ghost" icon="i-heroicons-ellipsis-horizontal-20-solid" />
            </UDropdown>
          </template>
        </UTable>
      </ClientOnly>
    </div>
  </div>
</template>
