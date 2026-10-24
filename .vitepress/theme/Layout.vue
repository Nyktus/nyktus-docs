<!-- SPDX-FileCopyrightText: The Nyktus Authors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- The wordmark names the site; the logo alone would not. -->
    <template #nav-bar-title-after>
      <span class="site-label">Docs</span>
    </template>
  </Layout>
</template>
