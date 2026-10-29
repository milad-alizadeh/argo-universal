export function addProfileRows() {
  for (const [id, count] of [
    ['list-content', 150],
    ['detail-content', 300],
  ]) {
    const selector = `[data-testid="${id}"]`;
    const parent = document.querySelector(selector).parentElement;

    for (let row = 0; row < count; row++) {
      const item = document.createElement('div');
      item.textContent = `Profiling row ${row}: representative text content that stays readable while the Frame moves.`;
      item.style.cssText = 'padding:8px 16px;font-size:14px;line-height:20px;';
      parent.appendChild(item);
    }
  }
}
