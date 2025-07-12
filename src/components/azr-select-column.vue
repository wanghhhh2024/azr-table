<template>
  <el-table-column :width="width" :label="label" :prop="prop">
    <template #header>
      <column-header :title="title" :tooltip="tooltip" :property="prop" :data="props.tableData"
        :is-required="props.isRequired" :show-fill="props.showFill" :show-clear="props.showClear"
        :show-copy="props.showCopy" />
    </template>
    <template #default="{ row, $index }">
      <el-select v-if="`${$index}-${prop}` === editKey" ref="selectRef" :key="`${$index}-${prop}`"
        :data-cell-key="`${$index}-${prop}`" :filterable="filterable" v-model="row[prop]"
        :placeholder="props.placeholder" :automatic-dropdown="true" @blur="onBlur">
        <el-option v-for="option in options" :key="option.id !== undefined ? option.id : option.value"
          :label="option.name || option.label" :value="option.id !== undefined ? option.id : option.value" />
      </el-select>
      <template v-else>
        <div class="el-select w-full">
          <div class="el-select__wrapper el-tooltip__trigger el-tooltip__trigger" tabindex="-1">
            <div class="el-select__selection">
              <div class="el-select__selected-item el-select__placeholder">
                <span v-if="row[prop]">{{ enumTxt(row[prop]) }}</span>
                <span class="placeholder" v-else>{{ props.placeholder }}</span>
              </div>
            </div>
            <div class="el-select__suffix">
              <i class="el-icon el-select__caret el-select__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                  <path fill="currentColor"
                    d="M831.872 340.864 512 652.672 192.128 340.864a30.592 30.592 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.592 30.592 0 0 0-42.752 0z">
                  </path>
                </svg>
              </i>
            </div>
          </div>
        </div>
      </template>
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
  options: {
    type: Array,
    default: () => [],
  },
  // 是否必填
  isRequired: {
    type: Boolean,
    default: false,
  },
  filterable: {
    type: Boolean,
    default: true,
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
    default: '请输入内容',
  },
  tableData: {
    type: Array,
    default: () => [],
  },
})

// const inputValue = defineModel('data',{required: true});
const emit = defineEmits(['change'])
const editKey = defineModel('editKey')

const enumTxt = (val) => {
  const option = props.options.filter((x) => {
    return x.id == val || x.value == val
  })[0]

  return option?.label || option?.name || val
}

const selectRef = ref(null)

watch(
  () => editKey.value,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        if (selectRef.value) {
          debugger
          // 展开下拉
          selectRef.value.focus && selectRef.value.focus()
          // 或（部分版本支持）
          // selectRef.value.toggleMenu && selectRef.value.toggleMenu()
        }

        //         const selectComponent = document.querySelector(`[data-cell-key="${newValue}"]`)
        // if (selectComponent) {
        //   const dropdownIcon = selectComponent.querySelector('.el-select__caret')
        //   if (dropdownIcon) dropdownIcon.click()
        // }
      })
    }
  },
)

const onBlur = () => {
  editKey.value = ''
}
</script>
<style scoped lang="scss">
.placeholder {
  color: var(--el-text-color-placeholder);
}
</style>
