import "./globals.css";

export const metadata = {
  title: "SkillSwap — Learn together",
  description: "Exchange skills with students. Learn something. Teach something. Grow together.",
};

const themeBootstrap = `(function(){try{var m=localStorage.getItem("skillswap-theme")||"system";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";document.documentElement.dataset.themeMode=m;document.documentElement.dataset.theme=d}catch(e){document.documentElement.dataset.theme="light";document.documentElement.dataset.themeMode="system"}})()`;

export default function RootLayout({ children }) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }}/></head>
    <body>{children}</body>
  </html>;
}
