
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/product-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Store,
  PlusCircle,
  FolderPlus,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import type { Product, ProductView, ProductCategory } from "@/types";

interface ProductsTabProps {
  productView: ProductView;
  currentProduct: Partial<Product> | null;
  handleSaveProduct: (product: Partial<Product>) => void;
  setProductView: (view: ProductView) => void;
  setCurrentProduct: (product: Partial<Product> | null) => void;
  isSavingProduct: boolean;
  telegramProviderToken: string;
  telegramPaymentCurrency: string;
  currentCategoryView: string | null;
  setCurrentCategoryView: (name: string | null) => void;
  openProductForm: (category: string | null) => void;
  isAddingCategory: boolean;
  handleSaveCategory: () => void;
  productCategories: ProductCategory[];
  handleDeleteCategory: (id: string) => void;
  products: Product[];
  handleDeleteProduct: (id: string) => void;
  categoryModalOpen: boolean;
  setCategoryModalOpen: (open: boolean) => void;
  currentCategory: Partial<ProductCategory> | null;
  setCurrentCategory: (category: Partial<ProductCategory> | null) => void;
  openCategoryModal: (category?: Partial<ProductCategory> | null) => void;
  selectedProductIds: string[];
  setSelectedProductIds: (ids: string[]) => void;
  handleDeleteSelectedProducts: () => void;
}

export function ProductsTab({
  productView,
  currentProduct,
  handleSaveProduct,
  setProductView,
  setCurrentProduct,
  isSavingProduct,
  telegramProviderToken,
  telegramPaymentCurrency,
  currentCategoryView,
  setCurrentCategoryView,
  openProductForm,
  isAddingCategory,
  handleSaveCategory,
  productCategories,
  handleDeleteCategory,
  products,
  handleDeleteProduct,
  categoryModalOpen,
  setCategoryModalOpen,
  currentCategory,
  setCurrentCategory,
  openCategoryModal,
  selectedProductIds,
  setSelectedProductIds,
  handleDeleteSelectedProducts,
}: ProductsTabProps) {

  if (productView === 'form' && currentProduct) {
    return (
      <ProductForm
        product={currentProduct}
        onSave={handleSaveProduct}
        onCancel={() => setProductView('list')}
        isSaving={isSavingProduct}
        currency={telegramPaymentCurrency}
        useStars={!telegramProviderToken}
      />
    );
  }
  
  const handleSelectAll = (checked: boolean | string) => {
    if (checked) {
      const ids = products
        .filter(p => (currentCategoryView === null ? !p.category : p.category === currentCategoryView))
        .map(p => p._id!);
      setSelectedProductIds(ids);
    } else {
      setSelectedProductIds([]);
    }
  };

  const productsForCurrentView = products.filter(p =>
    currentCategoryView === null
      ? !p.category || p.category.trim() === ''
      : p.category === currentCategoryView
  );

  const isAllSelected = selectedProductIds.length > 0 && selectedProductIds.length === productsForCurrentView.length;

  return (
    <div className="space-y-6">
      <Card className="bg-transparent">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Управление товарами</CardTitle>
              <CardDescription>Создавайте категории и управляйте товарами.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openCategoryModal()}>
                <FolderPlus className="mr-2 h-4 w-4" /> Добавить категорию
              </Button>
              <Button onClick={() => openProductForm(currentCategoryView)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Добавить товар
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {productCategories.length > 0 && (
             <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Категории</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {productCategories.map(cat => (
                    <Card key={cat.id} className={`cursor-pointer transition-all ${currentCategoryView === cat.name ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`} onClick={() => setCurrentCategoryView(cat.name)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold">
                                {products.filter(p => p.category === cat.name).length} товар(а)
                            </div>
                        </CardContent>
                         <CardFooter className="p-2 pt-0 flex justify-end gap-1">
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openCategoryModal(cat);}}>
                                 <Edit className="h-4 w-4" />
                             </Button>
                             <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                         <Trash2 className="h-4 w-4 text-destructive" />
                                     </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                     <AlertDialogHeader>
                                         <AlertDialogTitle>Удалить категорию "{cat.name}"?</AlertDialogTitle>
                                         <AlertDialogDescription>
                                             Товары из этой категории не будут удалены, а станут "без категории". Это действие необратимо.
                                         </AlertDialogDescription>
                                     </AlertDialogHeader>
                                     <AlertDialogFooter>
                                         <AlertDialogCancel>Отмена</AlertDialogCancel>
                                         <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
                                     </AlertDialogFooter>
                                 </AlertDialogContent>
                             </AlertDialog>
                         </CardFooter>
                    </Card>
                    ))}
                </div>
            </div>
          )}
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold cursor-pointer" onClick={() => setCurrentCategoryView(null)}>
                  {currentCategoryView === null ? 'Товары без категории' : `Товары в категории "${currentCategoryView}"`}
                </h3>
                {selectedProductIds.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить выбранные ({selectedProductIds.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Вы собираетесь удалить {selectedProductIds.length} товаров. Это действие необратимо.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelectedProducts} className="bg-destructive hover:bg-destructive/90">
                                    Удалить
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <Card className="bg-transparent">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead padding="checkbox">
                       <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Выбрать все"
                        />
                    </TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Цена ({telegramPaymentCurrency})</TableHead>
                    <TableHead>Цена (⭐)</TableHead>
                    <TableHead>Кол-во</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsForCurrentView.length > 0 ? productsForCurrentView.map(p => (
                    <TableRow key={p._id}>
                      <TableCell padding="checkbox">
                         <Checkbox
                            checked={selectedProductIds.includes(p._id!)}
                            onCheckedChange={(checked) => {
                              setSelectedProductIds(
                                checked
                                  ? [...selectedProductIds, p._id!]
                                  : selectedProductIds.filter((id) => id !== p._id)
                              );
                            }}
                            aria-label="Выбрать строку"
                          />
                      </TableCell>
                      <TableCell>{p.buttonName}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>{p.priceReal || 0}</TableCell>
                      <TableCell>{p.price || 0}</TableCell>
                      <TableCell>{p.type === 'static' ? (p.staticKey?.split('\n').filter(k => k.trim() !== '').length || 0) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(p); setProductView('form'); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить товар "{p.buttonName}"?</AlertDialogTitle>
                              <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProduct(p._id!)} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Нет товаров в этой категории.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </CardContent>
      </Card>
       <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentCategory?.id ? 'Редактировать категорию' : 'Создать новую категорию'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="category-name">Название категории</Label>
                    <Input id="category-name" value={currentCategory?.name || ''} onChange={(e) => setCurrentCategory(cat => ({...cat, name: e.target.value}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="category-image-url">URL картинки (необязательно)</Label>
                    <Input id="category-image-url" value={currentCategory?.imageUrl || ''} onChange={(e) => setCurrentCategory(cat => ({...cat, imageUrl: e.target.value}))} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>Отмена</Button>
                <Button onClick={handleSaveCategory} disabled={isAddingCategory}>
                  {isAddingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Сохранить
                </Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>
    </div>
  );
}
