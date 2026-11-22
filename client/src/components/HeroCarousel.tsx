import { useEffect, useState } from 'react';

const SLIDES = [
  {
    src: '/hero/hero1.jpg',
    title: '它的每一天，都值得被记住',
    subtitle: '体重、饮食、精神状态，都是健康的小线索。'
  },
  {
    src: '/hero/hero2.jpg',
    title: '小变化，早发现',
    subtitle: '体温、食欲、排便，异常时第一时间留档。'
  },
  {
    src: '/hero/hero3.jpg',
    title: '就医资料不再翻箱倒柜',
    subtitle: '诊断、处方、检查报告，一次就诊一处归档。'
  },
  {
    src: '/hero/hero4.jpg',
    title: '疫苗驱虫，到期有提醒',
    subtitle: '7 天内到期会在首页高亮，提前安排不慌张。'
  },
  {
    src: '/hero/hero5.jpg',
    title: '照片会说话',
    subtitle: '给生活照加上标签，回看它的每一个可爱瞬间。'
  },
  {
    src: '/hero/hero6.jpg',
    title: '一只宠物，一份完整档案',
    subtitle: '猫猫狗狗都能拥有自己的健康小档案。'
  }
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const go = (next: number) => setIndex((next + SLIDES.length) % SLIDES.length);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-100 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="宠物照片轮播"
    >
      <div className="relative h-[230px] sm:h-[300px] lg:h-[340px]">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.title}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3a2417]/80 via-[#3a2417]/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-8">
          <div className="max-w-xl text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-orange-200">PetCare Diary</p>
            <h2 className="mt-1.5 text-xl font-bold leading-snug md:text-3xl">{SLIDES[index].title}</h2>
            <p className="mt-1.5 text-sm text-white/85 md:text-base">{SLIDES[index].subtitle}</p>
          </div>

          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(index - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(index + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
            >
              ›
            </button>
          </div>
        </div>

        <div className="absolute right-5 top-5 flex gap-1.5 rounded-full bg-black/20 px-3 py-2 backdrop-blur md:right-8 md:top-8">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`切换到第 ${i + 1} 张`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
