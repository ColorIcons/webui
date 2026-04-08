export const useCollapseTransition = () => {
  const onBeforeEnter = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = "0";
    e.style.opacity = "0";
    e.style.overflow = "hidden";
  };

  const onEnter = (el: Element) => {
    const e = el as HTMLElement;
    void e.offsetHeight;
    e.style.height = `${el.scrollHeight}px`;
    e.style.opacity = "1";
  };

  const onAfterEnter = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = "auto";
    e.style.overflow = "";
  };

  const onBeforeLeave = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = `${el.scrollHeight}px`;
    e.style.opacity = "1";
    e.style.overflow = "hidden";
  };

  const onLeave = (el: Element) => {
    const e = el as HTMLElement;
    void e.offsetHeight;
    e.style.height = "0";
    e.style.opacity = "0";
  };

  const onAfterLeave = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = "";
    e.style.opacity = "";
  };

  return {
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
  };
};
