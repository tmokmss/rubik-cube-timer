import { mount } from 'svelte';
import AlgsApp from './AlgsApp.svelte';
import './app.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app が見つかりません');

export default mount(AlgsApp, { target });
