// src/app/admin/products/_components/ProductGridV12.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HardwareCard3D } from "./HardwareCard3D";

interface IProductGridV12Props {
  products: any[];
  categories: any[];
}

export function ProductGridV12({ products, categories }: IProductGridV12Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 py-8">
      <AnimatePresence mode="popLayout">
        {products.map((p, index) => {
          const category = categories.find(c => c.id === p.categoryId);
          const subcategory = category?.subcategories.find((s: any) => s.id === p.subcategoryId);
          
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.05, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="h-full"
            >
              <HardwareCard3D 
                p={p} 
                categoryName={category?.name}
                subcategoryName={subcategory?.name}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
