
"use server";
import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getConfig, updateConfig } from '../status/route';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';

const PRODUCTS_COLLECTION = "products";

const defaultCategories = ["MooNTooL STORE"];
const defaultProducts = [
  {
    category: "MooNTooL STORE",
    buttonName: "Доступ на 7 дней",
    invoiceTitle: "Доступ на 7 дней",
    invoiceDescription: "Подписка на сервис MooNTooL на 7 дней.",
    price: 1,
    priceReal: 10,
    type: 'static' as 'static' | 'api',
    staticKey: "ключ1\nключ2"
  },
  {
    category: "MooNTooL STORE",
    buttonName: "Доступ на 30 дней",
    invoiceTitle: "Доступ на 30 дней",
    invoiceDescription: "Подписка на сервис MooNTooL на 30 дней.",
    price: 5,
    priceReal: 50,
    type: 'static' as 'static' | 'api',
    staticKey: "ключ30-1\nключ30-2"
  },
    {
    category: "MooNTooL STORE",
    buttonName: "Доступ на 90 дней",
    invoiceTitle: "Доступ на 90 дней",
    invoiceDescription: "Подписка на сервис MooNTooL на 90 дней.",
    price: 10,
    priceReal: 100,
    type: 'static' as 'static' | 'api',
    staticKey: "ключ90-1\nключ90-2"
  }
];

async function checkAuth(): Promise<boolean> {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    return !!session.isLoggedIn;
}

async function seedDatabase(db: any, config: any) {
    const productCollection = db.collection(PRODUCTS_COLLECTION);
    const count = await productCollection.countDocuments();
    if (count === 0) {
        console.log("Seeding database with default products and categories...");
        await productCollection.insertMany(defaultProducts.map(p => ({...p, _id: new ObjectId() })));
        
        const currentCategories = config.productCategories || [];
        const newCategories = [...new Set([...currentCategories, ...defaultCategories])];
        await updateConfig({ productCategories: newCategories });
        console.log("Seeding complete.");
        return newCategories;
    }
    return null;
}


// GET all products OR categories
export async function GET(request: Request) {
  let mongoClient: MongoClient | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const fetchType = searchParams.get('type');
    const config = await getConfig();
    const { MONGODB_URI, MONGODB_DB_NAME } = config;

    if (!MONGODB_URI) throw new Error("MongoDB not configured");

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
    const db = mongoClient.db(dbName);
    
    // Seed data if db is empty
    const seededCategories = await seedDatabase(db, config);

    if (fetchType === 'categories') {
        const finalCategories = seededCategories || config.productCategories || [];
        return NextResponse.json({ categories: finalCategories });
    }
    
    const products = await db.collection(PRODUCTS_COLLECTION).find({}).toArray();
    return NextResponse.json({ products });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
      if(mongoClient) await mongoClient.close();
  }
}

// POST a new product OR a new category
export async function POST(request: Request) {
  let mongoClient: MongoClient | undefined;
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
  }

  try {
    const config = await getConfig();
    const { MONGODB_URI, MONGODB_DB_NAME } = config;

    const body = await request.json();

    // Handle Category Creation
    if (body.action === 'add_category') {
        const { categoryName } = body;
        if (!categoryName) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }
        const currentCategories = config.productCategories || [];
        if (currentCategories.includes(categoryName)) {
            return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
        }
        const newCategories = [...currentCategories, categoryName];
        await updateConfig({ productCategories: newCategories });
        return NextResponse.json({ success: true, categories: newCategories });
    }

    // Handle Product Creation
    if (!MONGODB_URI) throw new Error("MongoDB not configured");
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
    const db = mongoClient.db(dbName);

    const product = { ...body };
    delete product._id; 
    
    if (product.price) product.price = Number(product.price) || 1;
    if (product.priceReal) product.priceReal = Number(product.priceReal) || 0;
    if (product.apiDays) product.apiDays = Number(product.apiDays);

    const result = await db.collection(PRODUCTS_COLLECTION).insertOne(product);
    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
      if(mongoClient) await mongoClient.close();
  }
}

// PUT (update) a product
export async function PUT(request: Request) {
  let mongoClient: MongoClient | undefined;
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
  }

  try {
    const config = await getConfig();
    const { MONGODB_URI, MONGODB_DB_NAME } = config;
    if (!MONGODB_URI) throw new Error("MongoDB not configured");
    
    const { _id, ...productData } = await request.json();
    if (!_id) {
      return NextResponse.json({ error: 'Product ID is required for update.' }, { status: 400 });
    }
    
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
    const db = mongoClient.db(dbName);

    if (productData.price) productData.price = Number(productData.price) || 1;
    if (productData.priceReal) productData.priceReal = Number(productData.priceReal) || 0;
    if (productData.apiDays) productData.apiDays = Number(productData.apiDays);

    const result = await db.collection(PRODUCTS_COLLECTION).updateOne(
      { _id: new ObjectId(_id) }, 
      { $set: productData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
      if(mongoClient) await mongoClient.close();
  }
}

// DELETE a product OR a category
export async function DELETE(request: Request) {
  let mongoClient: MongoClient | undefined;
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
  }
  
  try {
    const config = await getConfig();
    const { MONGODB_URI, MONGODB_DB_NAME } = config;

    const body = await request.json();
    
    if (!MONGODB_URI) throw new Error("MongoDB not configured");
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
    const db = mongoClient.db(dbName);

    // Handle Category Deletion
    if (body.action === 'delete_category') {
        const { categoryName } = body;
        if (categoryName === undefined) { // Allow empty string but not undefined
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }
        const currentCategories = config.productCategories || [];
        if (!currentCategories.includes(categoryName)) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        const newCategories = currentCategories.filter((c: string) => c !== categoryName);
        await updateConfig({ productCategories: newCategories });
        
        // Also remove this category from all products
        await db.collection(PRODUCTS_COLLECTION).updateMany({ category: categoryName }, { $set: { category: '' } });

        return NextResponse.json({ success: true, categories: newCategories });
    }


    // Handle Product Deletion
    const { _id } = body;
    if (!_id) {
      return NextResponse.json({ error: 'Product ID is required for deletion.' }, { status: 400 });
    }
    
    const result = await db.collection(PRODUCTS_COLLECTION).deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
       return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
      if(mongoClient) await mongoClient.close();
  }
}
