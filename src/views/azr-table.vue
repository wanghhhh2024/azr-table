<template>
  <div style="width: 1000px;">
    <el-scrollbar class="scrollbar-flex" height="500" @end-reached="loadMore">
      <div class="scrollbar-flex-content">
        <el-table ref="experimentTable" :data="currentPageData" border
          v-drag="{ tableRef: experimentTable, onEditCell: (key: any) => { onEditCell(key) } }">
          <el-table-column type="selection" width="55" />
          <el-table-column type="index" width="50" />
          <!-- 
          <el-table-column label="操作" width="100" prop="name">         
          </el-table-column> -->
          <el-table-column type="index" width="50" prop="id">
          
          </el-table-column>
          <azr-Input-Column :width="120" :title="'Name'" :is-required="true" :show-fill="true" :tableData="tableData"
            :prop="'name'" v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-Input-Column :width="120" :title="'Age'" :is-required="true" :tableData="tableData" :prop="'age'"
            v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-select-Column :width="120" :title="'Sex'" :is-required="true" :show-copy="false" :tableData="tableData"
            :prop="'sex'" :options="sexOptions" v-model:editKey="editingCellKey">
          </azr-select-Column>

          <azr-Input-Column :width="140" :title="'phone'" :is-required="true" :tableData="tableData" :prop="'phone'"
            v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-Input-Column :width="200" :title="'email'" :is-required="false" :tableData="tableData" :prop="'email'"
            v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-select-Column :width="120" :title="'department'" :is-required="true" :show-copy="false"
            :tableData="tableData" :prop="'department'" :options="departmentOptions" v-model:editKey="editingCellKey">
          </azr-select-Column>

          <azr-select-Column :width="120" :title="'position'" :is-required="true" :show-copy="false"
            :tableData="tableData" :prop="'position'" :options="positionOptions" v-model:editKey="editingCellKey">
          </azr-select-Column>

          <azr-Input-Column :width="120" :title="'salary'" :is-required="false" :tableData="tableData" :prop="'salary'"
            v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-Input-Column :width="120" :title="'joinDate'" :is-required="true" :tableData="tableData"
            :prop="'joinDate'" v-model:editKey="editingCellKey">
          </azr-Input-Column>

          <azr-select-Column :width="120" :title="'status'" :is-required="true" :show-copy="false"
            :tableData="tableData" :prop="'status'" :options="statusOptions" v-model:editKey="editingCellKey">
          </azr-select-Column>
        </el-table>
      </div>
    </el-scrollbar>
  </div>

</template>

<script lang="ts" setup>
import { ref, computed, provide } from "vue";
import azrInputColumn from "@/components/azr-input-column.vue";
import azrSelectColumn from "@/components/azr-select-column.vue";
import { drag } from "@/directives/drag";
import type { Column, ScrollbarDirection } from 'element-plus'
const vDrag = {
  mounted: drag.mounted,
  updated: drag.updated,
  unmounted: drag.unmounted,
};


const firstNames = ['John', 'James', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin'];
const departments = ['tech', 'product', 'design', 'operation', 'sales'];
const positions = ['junior', 'middle', 'senior', 'expert', 'manager', 'director'];
const statuses = ['active', 'probation', 'resigned'];

const tableData = ref(Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1,
  name: `${firstNames[index % firstNames.length]} ${lastNames[(index + 3) % lastNames.length]}`,
  age: 22 + (index % 40),
  sex: (index % 2) === 0 ? 'male' : 'female',
  phone: `1${3 + (index % 6)}${String(1000000000 + index).slice(-8)}`,
  email: `user${index + 1}@company.com`,
  department: departments[index % departments.length],
  position: positions[index % positions.length],
  salary: (8000 + (index % 50) * 1000).toString(),
  joinDate: new Date(2020 + (index % 4), index % 12, (index % 28) + 1).toISOString().split('T')[0],
  status: statuses[index % statuses.length],
})));

// 动态选项数据
const sexOptions = computed(() => [
  { label: 'male', value: 'male' },
  { label: 'female', value: 'female' },
]);

const departmentOptions = computed(() => [
  { label: 'tech', value: 'tech' },
  { label: 'product', value: 'product' },
  { label: 'design', value: 'design' },
  { label: 'operation', value: 'operation' },
  { label: 'sales', value: 'sales' },
]);

const positionOptions = computed(() => [
  { label: 'junior', value: 'junior' },
  { label: 'middle', value: 'middle' },
  { label: 'senior', value: 'senior' },
  { label: 'expert', value: 'expert' },
  { label: 'manager', value: 'manager' },
  { label: 'director', value: 'director' },
]);

const statusOptions = computed(() => [
  { label: 'active', value: 'active' },
  { label: 'probation', value: 'probation' },
  { label: 'resigned', value: 'resigned' },
]);

const experimentTable = ref(null);
const editingCellKey = ref(null);
const onEditCell = (key: any) => {
  editingCellKey.value = key;
};

const pageSize = ref(500);
const pageIndex = ref(1);
const total = ref(tableData.value.length);
const pageCount = computed(() => Math.ceil(total.value / pageSize.value));
// Start with first page of data
const currentPageData = ref(tableData.value.slice(0, pageSize.value));
const loadNextPage = () => {
  if (pageIndex.value >= pageCount.value) {
    return;
  }
  pageIndex.value++;
  const start = (pageIndex.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const nextPageData = tableData.value.slice(start, end);
  // Append new data instead of replacing
  currentPageData.value = [...currentPageData.value, ...nextPageData];
};
const loadPrevPage = () => {
  if (pageIndex.value <= 1) {
    return;
  }
  pageIndex.value--;

  const start = (pageIndex.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const prevPageData = tableData.value.slice(start, end);
  // Prepend new data instead of replacing
  currentPageData.value = [...prevPageData, ...currentPageData.value];
};

const loadMore = (direction: ScrollbarDirection) => {
  if (direction === 'bottom') {
    loadNextPage();
  } else if (direction === 'top') {
    loadPrevPage();
  }
}


const handleFill = (property: any) => {
  if (property == null || property == undefined || property == '') {
    return
  }

  if (tableData.value.length <= 1) {
    return
  }
  const source = (tableData.value[0][property] || '').toString()
  const re = /([1-9][0-9]*)$/
  let match = source.match(re)
  let last = match != null ? parseInt(match[1]) : 1
  let name = source.replace(re, '')
  if (name.length > 0 && name[name.length - 1] != '_' && name[name.length - 1] != '-') {
    name = name + '_'
  }
  for (let i = 0; i < tableData.value.length; i++) {
    tableData.value[i][property] = `${name}${last + i}`
  }
}
provide('handleFill', handleFill)


const handleCopy = (property: any) => {
  if (property == null || property == undefined || property == '') {
    return
  }

  const source = tableData.value[0][property]
  for (let i = 1; i < tableData.value.length; i++) {
    if (Array.isArray(source)) {
      tableData.value[i][property] = [...source]
    } else {
      tableData.value[i][property] = source
    }
  }
}
provide('handleCopy', handleCopy)

const handleClear = (property: any) => {
  if (property == null || property == undefined || property == '') {
    return
  }
  for (let i = 0; i < tableData.value.length; i++) {
    tableData.value[i][property] = null
  }
}
provide('handleClear', handleClear)

</script>
<style lang="scss">
.scrollbar-flex .el-scrollbar__wrap {
  margin-bottom: 5px !important;
  margin-right: 5px !important;
}

.scrollbar-flex-content {
  display: flex;
  width: fit-content;
  position: relative;


}
</style>