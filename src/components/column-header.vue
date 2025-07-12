<!-- 表格列标题组件 -->
<template>
  <div class="column-header">
    <div class="title-container">
      <span class="required" v-if="isRequired">*</span>
      <span class="title">{{ title }}</span>
      <el-tooltip v-if="tooltip" placement="top">
        <template #content>
          <div v-html="tooltip"></div>
        </template>
        <el-icon class="icon-help"><question-filled /></el-icon>
      </el-tooltip>
    </div>
    <div class="action-buttons" v-if="showActionButtons">
      <el-icon class="icon" @click="() => { handleFill(props.property) }" v-if="showFill">
        <Download />
      </el-icon>
      <el-icon class="icon" @click="() => { handleCopy(props.property) }" v-if="showCopy">
        <Bottom />
      </el-icon>
      <el-icon class="icon" @click="() => (handleClear(props.property))" v-if="showClear">
        <CircleClose />
      </el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionFilled, CircleClose, Bottom, Download } from '@element-plus/icons-vue'
import { inject } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  property: {
    type: String,
    default: '',
  },
  // 列标题
  title: {
    type: String,
    required: true,
  },
  // 是否必填
  isRequired: {
    type: Boolean,
    default: false,
  },
  // 提示信息
  tooltip: {
    type: String,
    default: '',
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
})

const emit = defineEmits(['change'])
const handleFill = inject('handleFill')
const handleCopy = inject('handleCopy')
const handleClear = inject('handleClear')

</script>

<style scoped lang="scss">
.column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .title-container {
    display: flex;
    align-items: center;
    justify-content: center;

    .required {
      color: #f56c6c;
      margin-right: 2px;
    }

    .title {
      font-weight: 500;
      color: #000;
      font-size: 13px;
    }

    .icon-help {
      margin-left: 3px;
      font-size: 13px;
      color: #909399;
      cursor: pointer;
    }
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 3px;

    img {
      width: 16px;
      height: 16px;
    }

    .icon {
      font-size: 13px;
      cursor: pointer;
      color: #606266;

      &:hover {
        color: #409eff;
      }
    }
  }
}
</style>
