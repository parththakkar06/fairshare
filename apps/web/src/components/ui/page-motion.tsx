import { motion, type HTMLMotionProps } from 'framer-motion';

import { cn } from '@/lib/utils';

type PageMotionProps = HTMLMotionProps<'div'>;

export function PageMotion({ className, children, ...props }: PageMotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: 'easeOut' }}
      className={cn('app-page mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
