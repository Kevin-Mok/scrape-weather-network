// Read rendered values; structured data supplies dates absent from each row's label.
export const EXTRACT = `(() => {
 const rows=Array.from(document.querySelectorAll('[data-testid="expanded-row"]'));
 const data=JSON.parse(document.querySelector('[data-testid="hourly-weather-data-set-structured-data"]').textContent);
 const column=data.mainEntity['csvw:tableSchema']['csvw:columns'].find(c=>c['csvw:name']==='time');
 const times=column['csvw:cells'].map(c=>c['csvw:value']);
 return {times,expectedCount:document.querySelectorAll('[data-testid="forecast-module-row"]').length,rows:rows.map(r=>{
  const text=(selector)=>{const e=r.querySelector(selector);if(!e)throw new Error('Missing hourly field '+selector);return e.textContent.trim()};
  return {label:text('[data-testid="row-date-or-time"]'),temp:text('[data-testid="row-temperature"]'),feelsLike:text('[data-testid="row-feels-like"]'),condition:text('[data-testid="expanded-row-weather-text"]'),wind:text('#wind-value'),windGust:text('#wind-gust-value'),humidity:text('#humidity-value'),precipProb:text('#pop-value')};
 })};
})()`;
