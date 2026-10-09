import { mount } from 'svelte';
import F2LApp from './F2LApp.svelte';
import './app.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app が見つかりません');

export default mount(F2LApp, { target });
