<template>
  <el-table-column :width="width" :label="label" :prop="prop">
    <template #header>
      <column-header :title="title" :tooltip="tooltip" :property="prop"
        :is-required="props.isRequired" :show-fill="props.showFill" :show-clear="props.showClear"
        :show-copy="props.showCopy" />
    </template>
    <template #default="{ row, $index }">
      <el-input v-if="`${$index}-${prop}` === editKey" ref="inputRef" :placeholder="props.placeholder"
        v-model="row[prop]" :key="`${$index}-${prop}`" :data-cell-key="`${$index}-${prop}`" @blur="onBlur">
      </el-input>
      <div class="flex-container" v-else-if="row[prop]">
        <span class="truncate-text">{{ row[prop] }}</span>
        <slot name="icon" v-bind="{ row, $index }"></slot>
      </div>
      <span class="placeholder" v-else>{{ props.placeholder }}</span>
    </template>
  </el-table-column>
</template>
<script setup lang="ts">
import { ref, defineProps, defineEmits, defineModel, watch, nextTick } from 'vue'
import columnHeader from './column-header.vue'

const props = defineProps({
  prop: {
    type: String || Boolean,
    default: '',
  },
  // 是否必填
  isRequired: {
    type: Boolean,
    default: false,
  },
  showActionButtons: {
    type: Boolean,
    default: true,
  },
  showFill: {
    type: Boolean,
    default: false,
  },
  showCopy: {
    type: Boolean,
    default: true,
  },
  showClear: {
    type: Boolean,
    default: true,
  },
  clear: {
    type: Boolean,
    default: true,
  },
  width: {
    type: [String, Number],
    default: '100px',
  },
  label: {
    type: String,
    default: '',
  },
  tooltip: {
    type: String,
    default: 'input tooltip',
  },
  title: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Input here',
  },
  tableData: {
    type: Array,
    default: () => [],
  },
})

// const inputValue = defineModel('data',{required: true});
const emit = defineEmits(['change'])
const editKey = defineModel('editKey')

const inputRef = ref(null)
// Inside your component setup
watch(
  () => editKey.value,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.focus && inputRef.value.focus()
          inputRef.value.select && inputRef.value.select()
        }
        // const input = document.querySelector(`[data-cell-key="${newValue}"]`)
        // if (input) input.focus()
      })
    }
  },
)

const onBlur = (val) => {
  editKey.value = ''
}
</script>
<style lang="scss">
.placeholder {
  color: var(--el-text-color-placeholder);
}

.flex-container {
  display: flex;
  align-items: center;
  width: 100%;
  // gap: 5px;
}

.opt-icon {
  width: 50px;
  height: 16px;
  cursor: pointer;
  margin-right: -20px;
  margin-left: 5px;
}

.vector-icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
</style>
