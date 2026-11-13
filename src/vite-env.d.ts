/// <reference types="vite/client" />

/** When each file of content/ and quizzes/ was added to the site, in ms (vite-plugin-dates.ts). */
declare module 'virtual:content-dates' {
  const dates: Record<string, number>;
  export default dates;
}
