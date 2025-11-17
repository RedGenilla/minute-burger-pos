import React, { useState, useEffect } from "react";
// Replaced PNG icons with inline SVGs for stock in/out actions
import { UserAuth } from "../authenticator/AuthContext";
import { supabase } from "../supabaseClient";
import "./ingredients.css";
import AdminSidebar from "./AdminSidebar";

const categoryOptions = [
  { value: "BR", label: "BR/Bread" },
  { value: "PR", label: "PR/Protein" },
  { value: "CH", label: "CH/Cheese" },
  { value: "VG", label: "VG/Vegetable" },
  { value: "SC", label: "SC/Sauce" },
  { value: "SD", label: "SD/Snack" },
  { value: "BV", label: "BV/Beverage" },
  { value: "EX", label: "EX/Add-on" },
];

/* eslint-disable no-unused-vars */
const itemCodes = {
  BR: [
    { code: "BR-001", name: "Burger Bun (Regular)" },
    { code: "BR-002", name: "Burger Bun (Premium)" },
    { code: "BR-003", name: "Hotdog Bun" },
  ],
  PR: [
    { code: "PR-001", name: "Beef Patty (Regular)" },
    { code: "PR-002", name: "Beef Patty (Premium)" },
    { code: "PR-003", name: "Chicken Patty (Regular)" },
    { code: "PR-004", name: "Chicken Patty (Premium)" },
    { code: "PR-005", name: "Frank Sausage" },
    { code: "PR-006", name: "Bacon Stripes" },
    { code: "PR-007", name: "Whole egg" },
  ],
  CH: [
    { code: "CH-001", name: "Cheese Slice" },
    { code: "CH-002", name: "Cheese Sauce" },
  ],
  VG: [
    { code: "VG-001", name: "Lettuce" },
    { code: "VG-002", name: "Tomato" },
    { code: "VG-003", name: "Onion" },
    { code: "VG-004", name: "Cabbage" },
  ],
  SC: [
    { code: "SC-001", name: "Ketchup" },
    { code: "SC-002", name: "Mayonnaise" },
    { code: "SC-003", name: "Mustard" },
    { code: "SC-004", name: "Shawarma Sauce" },
    { code: "SC-005", name: "Chimichurri Sauce" },
    { code: "SC-006", name: "Roasted Sesame Dressing" },
    { code: "SC-007", name: "Black Pepper Sauce" },
    { code: "SC-008", name: "Chili con Carne" },
  ],
  SD: [
    { code: "SD-001", name: "Nachos" },
    { code: "SD-002", name: "Clover Chips" },
    { code: "SD-003", name: "Coleslaw Mix" },
  ],
  BV: [
    { code: "BV-001", name: "Iced Choco Mix" },
    { code: "BV-002", name: "Hot Choco Mix" },
    { code: "BV-003", name: "Coffee Mix" },
    { code: "BV-004", name: "Milk Tea Syrup (Wintermelon)" },
    { code: "BV-005", name: "Milk Tea Syrup (Krazy)" },
    { code: "BV-006", name: "Juice Concentrate (Calamansi)" },
    { code: "BV-007", name: "Juice Concentrate (Fruitwist)" },
    { code: "BV-008", name: "Mineral Water" },
  ],
  EX: [
    { code: "EX-001", name: "Extra Cheese" },
    { code: "EX-002", name: "Extra Egg" },
    { code: "EX-003", name: "Extra Coleslaw" },
  ],
};

const unitOptions = {
  "BR-001": ["pc"],
  "BR-002": ["pc"],
  "BR-003": ["pc"],
  "PR-001": ["pc"],
  "PR-002": ["pc"],
  "PR-003": ["pc"],
  "PR-004": ["pc"],
  "PR-005": ["pc"],
  "PR-006": ["strips", "pack"],
  "PR-007": ["pc"],
  "CH-001": ["slice"],
  "CH-002": ["g", "L"],
  "VG-001": ["g"],
  "VG-002": ["pc", "g"],
  "VG-003": ["pc", "g"],
  "VG-004": ["kg"],
  "SC-001": ["g", "ml"],
  "SC-002": ["g", "ml"],
  "SC-003": ["g", "ml"],
  "SC-004": ["g", "ml"],
  "SC-005": ["g", "ml"],
  "SC-006": ["g", "ml"],
  "SC-007": ["g", "ml"],
  "SC-008": ["g"],
  "SD-001": ["g"],
  "SD-002": ["pack"],
  "SD-003": ["g"],
  "BV-001": ["g"],
  "BV-002": ["g"],
  "BV-003": ["g"],
  "BV-004": ["ml"],
  "BV-005": ["ml"],
  "BV-006": ["ml"],
  "BV-007": ["ml"],
  "BV-008": ["bit"],
  "EX-001": ["slice"],
  "EX-002": ["pc"],
  "EX-003": ["g"],
};
/* eslint-enable no-unused-vars */

export default function IngredientsDashboard() {
  const { session } = UserAuth();
  useEffect(() => {
    if (session === null) window.location.href = "/login";
  }, [session]);

  const LOW_STOCK_THRESHOLD = 5;

  const [items, setItems] = useState([]);
  const [stockSummary, setStockSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    status: "Inactive",
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");
  const [categoryFilter, setCategoryFilter] = useState("Category");

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockType, setStockType] = useState("in");
  const [stockItem, setStockItem] = useState(null);
  const [stockValues, setStockValues] = useState({
    quantity: "",
    cost: "",
    expires_at: "", // will hold datetime-local string e.g. 2025-11-17T14:30
    reason: "",
  });
  const [stockError, setStockError] = useState("");
  const [stockOutTransactions, setStockOutTransactions] = useState([]);
  const [stockOutTxSearch, setStockOutTxSearch] = useState("");
  const [stockOutTxTypeFilter, setStockOutTxTypeFilter] = useState("All");
  const [showDeductForm, setShowDeductForm] = useState(false);

  // Helper: format transaction date using created_at if available (full timestamp),
  // fall back to date (which may be a DATE only). If the value represents a UTC
  // midnight date (rendering as 8:00 AM locally) or is date-only, show just the
  // local date without a misleading time.
  const formatTxDate = (tx) => {
    try {
      const raw = tx.created_at || tx.date;
      if (!raw) return "-";
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      const isDateOnly = /^(\d{4}-\d{2}-\d{2})$/.test(raw);
      const hours = d.getHours();
      const minutes = d.getMinutes();
      // If backend truncated time (midnight UTC -> 8 AM local) OR date-only, hide time.
      const looksLikeMidnightShift = hours === 8 && minutes === 0 && isDateOnly;
      if (isDateOnly || looksLikeMidnightShift) {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    } catch {
      return "-";
    }
  };

  // // Helper: calculate dynamic expiration warning message
  // const getExpirationWarning = (expirationDate) => {
  //   if (!expirationDate) return null;
  //   const now = Date.now();
  //   const expMs = new Date(expirationDate).getTime();
  //   const diff = expMs - now;

  //   if (diff <= 0) return "Expired";

  //   const oneHour = 60 * 60 * 1000;
  //   const oneDay = 24 * oneHour;

  //   if (diff < oneHour) {
  //     return "Expires in less than 1 hour";
  //   } else if (diff < oneDay) {
  //     const hours = Math.floor(diff / oneHour);
  //     return `Expires in ${hours} hour${hours > 1 ? "s" : ""}`;
  //   } else {
  //     const days = Math.floor(diff / oneDay);
  //     return `Expires in ${days} day${days > 1 ? "s" : ""}`;
  //   }
  // };

  // Notification Bell State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState("lowStock"); // 'lowStock' or 'expiring'
  const [lowStockNotifications, setLowStockNotifications] = useState([]);
  const [expiringNotifications, setExpiringNotifications] = useState([]);
  const [resolvedNotifications, setResolvedNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("resolvedNotifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save resolved notifications to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "resolvedNotifications",
        JSON.stringify(Array.from(resolvedNotifications))
      );
    } catch (error) {
      console.error("Failed to save resolved notifications:", error);
    }
  }, [resolvedNotifications]);

  // View Logs State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsItem, setLogsItem] = useState(null);
  const [itemLogs, setItemLogs] = useState([]);

  // Expired Items State
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredItems, setExpiredItems] = useState([]);

  // Store batch data for expiration warnings
  const [batchData, setBatchData] = useState({});

  const updateMenuItemStatus = async () => {
    const { data: menuItems, error: menuError } = await supabase
      .from("menu-list")
      .select("id, status");
    if (menuError || !menuItems) return;
    for (const menuItem of menuItems) {
      const { data: menuIngredients, error: ingError } = await supabase
        .from("menu_ingredients")
        .select("ingredient_id, amount")
        .eq("menu_id", menuItem.id);
      if (ingError || !menuIngredients) continue;
      let isAvailable = true;
      for (const ing of menuIngredients) {
        const { data: movements, error: movError } = await supabase
          .from("stock_movement")
          .select("type, quantity")
          .eq("ingredient_id", ing.ingredient_id);
        if (movError || !movements) continue;
        let currentQty = 0;
        for (const m of movements) {
          currentQty += m.type === "in" ? m.quantity : -m.quantity;
        }
        if (currentQty < Number(ing.amount)) {
          isAvailable = false;
          break;
        }
      }
      // Only auto-downgrade to Inactive when inventory cannot satisfy recipe.
      // Do not auto-activate items; respect any manual Inactive choice.
      if (!isAvailable && menuItem.status !== "Inactive") {
        await supabase
          .from("menu-list")
          .update({ status: "Inactive" })
          .eq("id", menuItem.id);
      }
    }
  };

  const openLogsModal = async (item) => {
    setLogsItem(item);
    // Fetch all stock movements for this item
    const { data, error } = await supabase
      .from("stock_movement")
      .select("*")
      .eq("ingredient_id", item.id)
      .order("date", { ascending: false });

    if (!error && data) {
      setItemLogs(data);
    }
    setShowLogsModal(true);
  };

  const openStockModal = async (item, type) => {
    setStockItem(item);
    setStockType(type);
    setStockValues({ quantity: "", cost: "", expires_at: "", reason: "" });
    setStockOutTxSearch("");
    setStockOutTxTypeFilter("All");
    setShowDeductForm(false);

    if (type === "out") {
      // Fetch all transactions for this specific ingredient
      const { data, error } = await supabase
        .from("stock_movement")
        .select("*")
        .eq("ingredient_id", item.id)
        .order("date", { ascending: false });

      if (!error && data) {
        setStockOutTransactions(data);
      }
    }

    setShowStockModal(true);
  };

  const handleStockChange = (e) => {
    const { name, value } = e.target;
    setStockValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setStockError("");
    if (!stockItem) return;

    // ...existing validation above...

    if (stockType === "out") {
      // Reuse FIFO availability for real-time, expiry-aware validation
      const { data: movs } = await supabase
        .from("stock_movement")
        .select(
          "id, ingredient_id, type, quantity, cost, expires_at, date, created_at"
        )
        .eq("ingredient_id", stockItem.id);

      const { quantity: availableNow } = computeAvailableQty(movs || []);
      const outQty = Number(stockValues.quantity);
      if (outQty > availableNow) {
        setStockError(
          `Cannot stock out more than available (${availableNow}).`
        );
        return;
      }
    }

    setLoading(true);
    const nowIso = new Date().toISOString();
    const txData = {
      ingredient_id: stockItem.id,
      type: stockType,
      date: nowIso, // store current timestamp
      created_at: nowIso, // also store current timestamp
      quantity: Number(stockValues.quantity),
      status: stockType === "out" ? "completed" : "Active",
      reason: stockValues.reason || null,
      ...(stockType === "in" && {
        cost: Number(stockValues.cost),
        expires_at: new Date(stockValues.expires_at).toISOString(),
      }),
    };

    const { error } = await supabase.from("stock_movement").insert(txData);
    if (error) {
      setStockError("Failed to save transaction: " + error.message);
      setLoading(false);
      return;
    }

    // Check if notifications should be resolved
    if (stockType === "in") {
      // After stock-in, check if low stock is resolved
      const { data: movements } = await supabase
        .from("stock_movement")
        .select(
          "id, ingredient_id, type, quantity, cost, expires_at, date, created_at"
        )
        .eq("ingredient_id", stockItem.id);

      if (movements) {
        const { quantity: newQty } = computeAvailableQty(movements);
        // If quantity is now above threshold, mark low stock notifications as resolved
        if (newQty > LOW_STOCK_THRESHOLD) {
          const newResolved = new Set(resolvedNotifications);
          lowStockNotifications.forEach((notif) => {
            if (notif.item_id === stockItem.id) {
              newResolved.add(notif.id);
            }
          });
          setResolvedNotifications(newResolved);
        }
      }
    } else if (stockType === "out" && stockValues.reason) {
      // After deduct, if reason contains 'expired', resolve expiring notifications for this item
      const reasonLower = stockValues.reason.toLowerCase();
      if (reasonLower.includes("expired") || reasonLower.includes("expire")) {
        const newResolved = new Set(resolvedNotifications);
        expiringNotifications.forEach((notif) => {
          if (notif.item_id === stockItem.id) {
            newResolved.add(notif.id);
          }
        });
        setResolvedNotifications(newResolved);
      }
    }

    setShowStockModal(false);
    setStockItem(null);
    setStockValues({ quantity: "", cost: "", expires_at: "", reason: "" });

    // Refresh inventory + logs to reflect immediately
    await fetchItems();
    if (
      showLogsModal &&
      logsItem &&
      logsItem.id === (txData.ingredient_id || stockItem.id)
    ) {
      const { data } = await supabase
        .from("stock_movement")
        .select("*")
        .eq("ingredient_id", txData.ingredient_id || stockItem.id)
        .order("date", { ascending: false });
      if (data) setItemLogs(data);
    }

    setLoading(false);
  };

  // (Kept for parity; not invoked here)
  const _placeOrderAndDeduct = async (orderData) => {
    try {
      const { data: orderInsert, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: orderData.user_id,
          total_price: orderData.total_price,
          payment_type: orderData.payment_type,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select();
      if (orderError || !orderInsert?.[0]) return;
      const orderId = orderInsert[0].id;
      for (const item of orderData.order_items) {
        const { data: itemInsert, error: itemError } = await supabase
          .from("order_items")
          .insert({
            order_id: orderId,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price: item.price,
            created_at: new Date().toISOString(),
          })
          .select();
        if (itemError || !itemInsert?.[0]) continue;
        const orderItemId = itemInsert[0].id;
        if (Array.isArray(item.ingredients)) {
          for (const ing of item.ingredients) {
            const { data: ingData } = await supabase
              .from("ingredient-list")
              .select("id")
              .eq("name", ing.name)
              .single();
            if (!ingData) continue;
            await supabase.from("order_item_ingredients").insert({
              order_item_id: orderItemId,
              ingredient_id: ingData.id,
              amount: Number(ing.amount) * Number(item.quantity),
              created_at: new Date().toISOString(),
            });
          }
        }
      }
      const { data: used } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId);
      if (used) {
        for (const oi of used) {
          const { data: ingList } = await supabase
            .from("order_item_ingredients")
            .select("ingredient_id, amount")
            .eq("order_item_id", oi.id);
          if (ingList) {
            for (const ing of ingList) {
              await supabase.from("stock_movement").insert({
                ingredient_id: ing.ingredient_id,
                type: "out",
                quantity: Number(ing.amount),
                date: new Date().toISOString(),
                status: "Active",
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
      await fetchItems();
    } catch {
      /* no-op */
    }
  };

  // Helper: robust available stock using FIFO across batches
  function computeAvailableQty(movs = [], returnBatches = false) {
    const now = Date.now();
    const batches = []; // { qty, expMs, originalQty, batchId, expires_at }
    let lastCost = 0;

    const sorted = [...movs].sort((a, b) => {
      const da = new Date(a.created_at || a.date).getTime();
      const db = new Date(b.created_at || b.date).getTime();
      if (da !== db) return da - db;
      // fall back to id if present to stabilize order
      return (a.id || 0) - (b.id || 0);
    });

    for (const m of sorted) {
      const qty = Number(m.quantity) || 0;
      if (m.type === "in") {
        if (qty <= 0) continue;
        const expMs = m.expires_at
          ? new Date(m.expires_at).getTime()
          : Infinity;
        batches.push({
          qty,
          expMs,
          originalQty: qty,
          batchId: m.id,
          expires_at: m.expires_at,
          cost: m.cost,
        });
        if (m.cost != null) lastCost = Number(m.cost) || lastCost;
      } else if (m.type === "out") {
        // Respect expiry at the time of the OUT event.
        // Only deduct from batches that were NOT expired when this OUT happened.
        const outTime = new Date(m.created_at || m.date).getTime();
        let remaining = qty;
        for (const b of batches) {
          if (remaining <= 0) break;
          // Skip batches already expired at the time of this OUT
          if (b.expMs < outTime) continue;
          const take = Math.min(remaining, b.qty);
          b.qty -= take;
          remaining -= take;
        }
      }
    }

    const quantity = batches.reduce(
      (sum, b) => sum + (b.expMs >= now ? b.qty : 0),
      0
    );

    if (returnBatches) {
      // Return active batches with their current quantities
      const activeBatches = batches.filter((b) => b.qty > 0 && b.expMs >= now);
      return { quantity, lastCost, batches: activeBatches };
    }

    return { quantity, lastCost };
  }

  const fetchItems = async () => {
    setLoading(true);
    const { data: itemsData } = await supabase
      .from("ingredient-list")
      .select("*");

    const { data: movements } = await supabase
      .from("stock_movement")
      .select(
        "id, ingredient_id, type, quantity, cost, expires_at, date, created_at"
      );

    setItems(itemsData || []);

    if (movements) {
      // group by ingredient and compute FIFO availability
      const byIng = movements.reduce((acc, m) => {
        (acc[m.ingredient_id] ||= []).push(m);
        return acc;
      }, {});
      const summary = {};
      const batchInfo = {};
      const expired = [];
      const now = Date.now();

      for (const [ingId, list] of Object.entries(byIng)) {
        const { quantity, lastCost, batches } = computeAvailableQty(list, true);
        summary[ingId] = { quantity, lastCost };
        batchInfo[ingId] = batches || [];

        // Track expired items
        const item = itemsData?.find((i) => i.id === Number(ingId));
        if (item) {
          list.forEach((m) => {
            if (m.type === "in" && m.expires_at) {
              const expMs = new Date(m.expires_at).getTime();
              if (expMs < now) {
                expired.push({
                  id: m.id,
                  item_name: item.name,
                  item_code: item.code,
                  quantity: Number(m.quantity) || 0,
                  expired_at: new Date(expMs),
                  cost: m.cost,
                });
              }
            }
          });
        }
      }
      setStockSummary(summary);
      setBatchData(batchInfo);
      // Sort expired items from most recent to oldest
      expired.sort((a, b) => b.expired_at.getTime() - a.expired_at.getTime());
      setExpiredItems(expired);
    } else {
      setStockSummary({});
      setBatchData({});
      setExpiredItems([]);
    }

    await updateMenuItemStatus();
    await detectNotifications(itemsData || [], movements || []);
    setLoading(false);
  };

  // Detect low stock and expiring notifications
  const detectNotifications = (itemsData, movements) => {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const lowStock = [];
    const expiring = [];

    // Group movements by ingredient for reuse with computeAvailableQty
    const byIng = {};
    (movements || []).forEach((m) => {
      (byIng[m.ingredient_id] ||= []).push(m);
    });

    itemsData.forEach((item) => {
      const movs = byIng[item.id] || [];
      const { quantity, batches } = computeAvailableQty(movs, true);

      // Low stock (same rule as table + badge)
      if (quantity > 0 && quantity <= LOW_STOCK_THRESHOLD) {
        lowStock.push({
          id: `lowstock-${item.id}`,
          item_id: item.id,
          item_name: item.name,
          item_code: item.code,
          quantity,
          type: "lowStock",
        });
      }

      // Per-batch expiring notifications with current remaining quantity
      if (batches && batches.length > 0) {
        batches.forEach((batch) => {
          if (batch.expires_at && batch.qty > 0) {
            const expMs = new Date(batch.expires_at).getTime();
            const timeToExpire = expMs - now;

            // Only show if expiring within 7 days and still has quantity
            if (timeToExpire > 0 && timeToExpire <= ONE_WEEK_MS) {
              expiring.push({
                id: `expiring-${item.id}-${batch.batchId}`,
                item_id: item.id,
                item_name: item.name,
                item_code: item.code,
                quantity: batch.qty, // Current remaining quantity for this batch
                expires_at: new Date(expMs),
                batchId: batch.batchId,
                type: "expiring",
              });
            }
          }
        });
      }
    });

    // Auto-remove expiring notifications when quantity reaches zero
    const filteredExpiring = expiring.filter((notif) => notif.quantity > 0);

    setLowStockNotifications(lowStock);
    setExpiringNotifications(filteredExpiring);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    const itemToAdd = { ...newItem, status: "Inactive" };
    const { error } = await supabase
      .from("ingredient-list")
      .insert([itemToAdd]);
    if (!error) {
      setShowForm(false);
      setNewItem({
        code: "",
        name: "",
        category: "",
        units: "",
        status: "Inactive",
      });
      // Immediately fetch latest inventory and menu item status after adding
      await fetchItems();
      // Optionally, fetch menu-list status if you want to show it in the UI
      // const { data: menuItems } = await supabase.from("menu-list").select("id, name, status");
      // setMenuItems(menuItems || []);
    } else {
      alert("Failed to add item: " + (error.message || JSON.stringify(error)));
    }
    setLoading(false);
  };

  // Edit feature removed per request: all edit state and handlers eliminated.

  const displayedItems = items
    .filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    )
    .map((item) => {
      const summary = stockSummary[item.id] || { quantity: 0, lastCost: 0 };
      // Do not display negative inventory; clamp to 0 for UI
      const qty = Math.max(0, Number(summary.quantity) || 0);
      let status = "Inactive";
      let lowStock = false;
      if (qty > LOW_STOCK_THRESHOLD) {
        status = "Active";
      } else if (qty > 0) {
        status = "Active";
        if (qty <= LOW_STOCK_THRESHOLD) lowStock = true;
      }

      // Get earliest expiring batch for this item
      const batches = batchData[item.id] || [];
      let nearestExpiration = null;
      let expirationWarning = null;

      if (batches.length > 0) {
        const sortedBatches = [...batches].sort((a, b) => a.expMs - b.expMs);
        if (sortedBatches[0] && sortedBatches[0].expires_at) {
          nearestExpiration = sortedBatches[0].expires_at;
          // expirationWarning = getExpirationWarning(nearestExpiration);
        }
      }

      return {
        ...item,
        quantity: qty,
        cost: summary.lastCost,
        status,
        lowStock,
        expirationWarning,
        nearestExpiration,
      };
    })
    .filter((item) => {
      if (filter === "Active" || filter === "Inactive")
        return item.status === filter;
      return true;
    })
    .filter((item) =>
      categoryFilter === "Category" ? true : item.category === categoryFilter
    );

  // Calculate unresolved notification count
  const unresolvedCount = (() => {
    const lowStockUnresolved = lowStockNotifications.filter(
      (notif) => !resolvedNotifications.has(notif.id)
    ).length;
    const expiringUnresolved = expiringNotifications.filter(
      (notif) => !resolvedNotifications.has(notif.id)
    ).length;
    return lowStockUnresolved + expiringUnresolved;
  })();

  return (
    <div className="opswat-admin">
      <AdminSidebar active="inventory" notificationCount={unresolvedCount} />

      <main className="ops-main">
        <header className="ops-header">
          <h1>Inventory</h1>
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: "#facc15", // yellow circle background
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="black"
                stroke="black"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {lowStockNotifications.length + expiringNotifications.length >
                0 && (
                <span
                  style={{
                    background: "#e53e3e",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                  }}
                >
                  {lowStockNotifications.length + expiringNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "48px",
                  right: "0",
                  width: "400px",
                  maxHeight: "500px",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid #e0e0e0",
                    padding: "8px",
                  }}
                >
                  <button
                    onClick={() => setNotificationTab("lowStock")}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      border: "none",
                      background:
                        notificationTab === "lowStock"
                          ? "#f97316"
                          : "transparent",
                      color: notificationTab === "lowStock" ? "white" : "#666",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight:
                        notificationTab === "lowStock" ? "bold" : "normal",
                    }}
                  >
                    Low Stock ({lowStockNotifications.length})
                  </button>
                  <button
                    onClick={() => setNotificationTab("expiring")}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      border: "none",
                      background:
                        notificationTab === "expiring"
                          ? "#f97316"
                          : "transparent",
                      color: notificationTab === "expiring" ? "white" : "#666",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight:
                        notificationTab === "expiring" ? "bold" : "normal",
                    }}
                  >
                    Expiring Items ({expiringNotifications.length})
                  </button>
                </div>

                <div
                  style={{
                    overflowY: "auto",
                    maxHeight: "440px",
                    padding: "12px",
                  }}
                >
                  {notificationTab === "lowStock" &&
                    (lowStockNotifications.length === 0 ? (
                      <p
                        style={{
                          textAlign: "center",
                          color: "#999",
                          padding: "20px",
                        }}
                      >
                        No low stock items
                      </p>
                    ) : (
                      lowStockNotifications.map((notif) => {
                        const isResolved = resolvedNotifications.has(notif.id);
                        return (
                          <div
                            key={notif.id}
                            style={{
                              padding: "12px",
                              marginBottom: "8px",
                              background: isResolved ? "#f5f5f5" : "#fff3cd",
                              border: `1px solid ${
                                isResolved ? "#ddd" : "#ffc107"
                              }`,
                              borderRadius: "8px",
                              boxShadow: isResolved
                                ? "none"
                                : "0 2px 4px rgba(255,193,7,0.2)",
                              animation: isResolved
                                ? "none"
                                : "pulse 2s ease-in-out infinite",
                            }}
                          >
                            <style>{`
                              @keyframes pulse {
                                0%, 100% { box-shadow: 0 2px 4px rgba(255,193,7,0.2); }
                                50% { box-shadow: 0 4px 12px rgba(255,193,7,0.6); }
                              }
                            `}</style>
                            <div
                              style={{
                                fontWeight: "bold",
                                marginBottom: "4px",
                              }}
                            >
                              {notif.item_name}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#666",
                                marginBottom: "4px",
                              }}
                            >
                              Code: {notif.item_code}
                            </div>
                            <div style={{ fontSize: "13px", color: "#d97706" }}>
                              Quantity: {notif.quantity} units
                            </div>
                          </div>
                        );
                      })
                    ))}

                  {notificationTab === "expiring" &&
                    (expiringNotifications.length === 0 ? (
                      <p
                        style={{
                          textAlign: "center",
                          color: "#999",
                          padding: "20px",
                        }}
                      >
                        No expiring items
                      </p>
                    ) : (
                      expiringNotifications.map((notif) => {
                        const isResolved = resolvedNotifications.has(notif.id);
                        return (
                          <div
                            key={notif.id}
                            style={{
                              padding: "12px",
                              marginBottom: "8px",
                              background: isResolved ? "#f5f5f5" : "#fee2e2",
                              border: `1px solid ${
                                isResolved ? "#ddd" : "#ef4444"
                              }`,
                              borderRadius: "8px",
                              boxShadow: isResolved
                                ? "none"
                                : "0 2px 4px rgba(239,68,68,0.2)",
                              animation: isResolved
                                ? "none"
                                : "pulseRed 2s ease-in-out infinite",
                            }}
                          >
                            <style>{`
                              @keyframes pulseRed {
                                0%, 100% { box-shadow: 0 2px 4px rgba(239,68,68,0.2); }
                                50% { box-shadow: 0 4px 12px rgba(239,68,68,0.6); }
                              }
                            `}</style>
                            <div
                              style={{
                                fontWeight: "bold",
                                marginBottom: "4px",
                              }}
                            >
                              {notif.item_name}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#666",
                                marginBottom: "4px",
                              }}
                            >
                              Code: {notif.item_code}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#dc2626",
                                marginBottom: "4px",
                              }}
                            >
                              Expires:{" "}
                              {new Date(notif.expires_at).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "13px", color: "#666" }}>
                              Quantity: {notif.quantity} units
                            </div>
                          </div>
                        );
                      })
                    ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="ops-controls ops-controls-row">
          <div className="controls-left">
            <div className="search-input-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              className="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>Category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="controls-right">
            <button
              className="add-btn"
              onClick={() => setShowExpiredModal(true)}
              type="button"
              style={{
                background: "#ef4444",
                marginRight: "8px",
              }}
            >
              Expired Items ({expiredItems.length})
            </button>
            <button
              className="add-btn"
              onClick={() => setShowForm(true)}
              type="button"
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Old simple controls removed; unified controls row above */}

        <div className="table-wrap">
          <table className="ops-table">
            <colgroup>
              <col style={{ width: "90px" }} />
              <col style={{ width: "100px" }} />
              <col />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Category</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Units</th>
                <th>Quantity</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">Loading…</td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    No items yet. Click "Add Item +" to create one.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr
                    key={item.id}
                    style={
                      item.lowStock ? { background: "#ffe6e6" } : undefined
                    }
                  >
                    <td>{item.category}</td>
                    <td>{item.code}</td>
                    <td>
                      <div>{item.name}</div>
                      {item.expirationWarning && (
                        <div style={{ marginTop: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              color: "#dc2626",
                              fontSize: "0.75em",
                              fontWeight: "bold",
                            }}
                          >
                            {item.expirationWarning}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{item.units}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.cost}</td>
                    <td>
                      <div>
                        <span className={`status ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </div>
                      {item.lowStock && (
                        <div style={{ marginTop: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              color: "red",
                              // borderRadius: "2px",
                              // padding: "2px 5px",
                              fontSize: "0.75em",
                              fontWeight: "bold",
                              // letterSpacing: "0.5px",
                            }}
                          >
                            Low Stock
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="view-logs-btn"
                        title="View Logs"
                        onClick={() => openLogsModal(item)}
                        style={{
                          // marginLeft retained from previous layout where an Edit button existed
                          padding: "6px 12px",
                          background: "#ff9a0c",
                          color: "white",
                          border: "none",
                          borderRadius: "12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                        aria-label="View Logs"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showStockModal && stockItem && (
          <div className="modal-bg" style={{ zIndex: 1200 }}>
            <div
              className="adminboard-modal"
              style={{
                width: stockType === "out" ? "700px" : "420px",
                maxWidth: "95vw",
                textAlign: "left",
              }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowStockModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">
                {stockType === "in" ? "STOCK IN" : "STOCK OUT"} -{" "}
                {stockItem.name}
              </span>

              {stockType === "out" ? (
                <div style={{ marginTop: "16px" }}>
                  {/* Header with Deduct button, Search, and Filters */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Left: Deduct button and Search */}
                    <button
                      type="button"
                      className="add-btn"
                      onClick={() => setShowDeductForm(!showDeductForm)}
                      style={{ marginRight: "8px" }}
                    >
                      {showDeductForm ? "Cancel" : "+ Deduct"}
                    </button>

                    <div
                      className="search-input-wrap"
                      style={{ flex: "1 1 200px", minWidth: "200px" }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="search-icon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        type="text"
                        className="search"
                        placeholder="Search by reason..."
                        value={stockOutTxSearch}
                        onChange={(e) => setStockOutTxSearch(e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Right: Filters */}
                    <select
                      value={stockOutTxTypeFilter}
                      onChange={(e) => setStockOutTxTypeFilter(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        minWidth: "140px",
                      }}
                    >
                      <option value="All">All Types</option>
                      <option value="in">Stock In</option>
                      <option value="out">Stock Out</option>
                    </select>
                  </div>

                  {/* Inline Deduct Form */}
                  {showDeductForm && (
                    <form
                      onSubmit={handleStockSubmit}
                      style={{
                        background: "#f9f9f9",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: "0 0 120px" }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              fontWeight: "500",
                            }}
                          >
                            Quantity
                          </label>
                          <input
                            name="quantity"
                            type="number"
                            value={stockValues.quantity}
                            onChange={handleStockChange}
                            required
                            min="1"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                        <div style={{ flex: "1 1 250px" }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              fontWeight: "500",
                            }}
                          >
                            Reason (Optional)
                          </label>
                          <input
                            name="reason"
                            type="text"
                            value={stockValues.reason}
                            onChange={handleStockChange}
                            placeholder="e.g., Damaged, Expired, Used for order"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn-confirm"
                          disabled={loading}
                          style={{ padding: "8px 24px", minWidth: "120px" }}
                        >
                          {loading ? "Saving..." : "Confirm"}
                        </button>
                      </div>
                      {stockError && (
                        <div
                          style={{
                            color: "red",
                            marginTop: "8px",
                            fontSize: "14px",
                          }}
                        >
                          {stockError}
                        </div>
                      )}
                    </form>
                  )}

                  {/* Transaction List */}
                  <div style={{ maxHeight: "450px", overflowY: "auto" }}>
                    {(() => {
                      const sorted = [...stockOutTransactions].sort(
                        (a, b) =>
                          new Date(b.created_at || b.date) -
                          new Date(a.created_at || a.date)
                      );
                      const filtered = sorted
                        .filter((tx) =>
                          stockOutTxTypeFilter === "All"
                            ? true
                            : tx.type === stockOutTxTypeFilter
                        )
                        .filter((tx) => {
                          if (!stockOutTxSearch) return true;
                          const reason = (tx.reason || "").toLowerCase();
                          return reason.includes(
                            stockOutTxSearch.toLowerCase()
                          );
                        });
                      if (filtered.length === 0)
                        return (
                          <div
                            style={{
                              padding: "32px",
                              textAlign: "center",
                              color: "#666",
                            }}
                          >
                            No transactions found.
                          </div>
                        );
                      return filtered.map((tx) => (
                        <div
                          key={tx.id}
                          style={{
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            margin: "8px 0",
                            padding: "12px",
                            background:
                              tx.type === "in" ? "#e6ffe6" : "#ffe6e6",
                          }}
                        >
                          <div style={{ marginBottom: 2 }}>
                            Type:{" "}
                            <b
                              style={{
                                color: tx.type === "in" ? "green" : "red",
                              }}
                            >
                              {tx.type.toUpperCase()}
                            </b>
                          </div>
                          <div style={{ marginBottom: 2 }}>
                            Date: {formatTxDate(tx)}
                          </div>
                          {tx.type === "in" && tx.expires_at && (
                            <div style={{ marginBottom: 2 }}>
                              Expiration:{" "}
                              {(() => {
                                try {
                                  const d = new Date(tx.expires_at);
                                  if (!isNaN(d.getTime()))
                                    return d.toLocaleString();
                                  return String(tx.expires_at);
                                } catch {
                                  return String(tx.expires_at);
                                }
                              })()}
                            </div>
                          )}
                          <div style={{ marginBottom: 2 }}>
                            Quantity: {tx.quantity}
                          </div>
                          {tx.type === "in" && (
                            <div style={{ marginBottom: 2 }}>
                              Cost: ₱{tx.cost || "-"}
                            </div>
                          )}
                          {tx.reason && (
                            <div
                              style={{
                                marginBottom: 2,
                                fontStyle: "italic",
                                color: "#555",
                              }}
                            >
                              Reason: {tx.reason}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                <form className="adduser-form" onSubmit={handleStockSubmit}>
                  <div className="two-col-row">
                    <div>
                      <label>Quantity</label>
                      <input
                        name="quantity"
                        type="number"
                        value={stockValues.quantity}
                        onChange={handleStockChange}
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label>Cost</label>
                      <input
                        name="cost"
                        type="number"
                        value={stockValues.cost}
                        onChange={handleStockChange}
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  <label>Expiration Date & Time</label>
                  <input
                    name="expires_at"
                    type="datetime-local"
                    value={stockValues.expires_at}
                    onChange={handleStockChange}
                    required
                  />

                  {stockError && (
                    <div style={{ color: "red", marginBottom: "8px" }}>
                      {stockError}
                    </div>
                  )}
                  <div className="single-confirm-wrap">
                    <button
                      type="submit"
                      className="btn-confirm full-width-confirm"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Confirm"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <button
                className="modal-close-x"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">ADD ITEM</span>
              <form className="adduser-form" onSubmit={addItem}>
                {/* Row 1: Name */}
                <label>Item Name</label>
                <input
                  name="name"
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  required
                  placeholder="Type item name"
                />

                {/* Row 2: Category */}
                <label>Category</label>
                <select
                  name="category"
                  value={newItem.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    setNewItem({ ...newItem, category });
                  }}
                  required
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Row 3: Item Code + Units side-by-side */}
                <div className="two-col-row">
                  <div>
                    <label>Item Code</label>
                    <input
                      name="code"
                      type="text"
                      value={newItem.code}
                      onChange={(e) =>
                        setNewItem({ ...newItem, code: e.target.value })
                      }
                      required
                      placeholder="Type or paste item code"
                    />
                  </div>
                  <div>
                    <label>Units</label>
                    <select
                      name="units"
                      value={newItem.units}
                      onChange={(e) =>
                        setNewItem({ ...newItem, units: e.target.value })
                      }
                      required
                    >
                      <option value="">Select units</option>
                      <option value="pc">pc</option>
                      <option value="strips / pack">strips / pack</option>
                      <option value="slice">slice</option>
                      <option value="g / L">g / L</option>
                      <option value="g">g</option>
                      <option value="pc / g">pc / g</option>
                      <option value="kg">kg</option>
                      <option value="g / ml">g / ml</option>
                      <option value="pack">pack</option>
                      <option value="ml">ml</option>
                      <option value="btl">btl</option>
                    </select>
                  </div>
                </div>

                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLogsModal && logsItem && (
          <div className="modal-bg" style={{ zIndex: 1100 }}>
            <div
              className="adminboard-modal"
              style={{ maxWidth: "600px", width: "100%", textAlign: "left" }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowLogsModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">
                Stock Movement Logs - {logsItem.name}
              </span>

              <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
                <button
                  onClick={() => openStockModal(logsItem, "in")}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Stock In
                </button>
                <button
                  onClick={() => {
                    setStockItem(logsItem);
                    setStockType("out");
                    setStockValues({
                      quantity: "",
                      cost: "",
                      expires_at: "",
                      reason: "",
                    });
                    setShowDeductForm(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Deduct
                </button>
              </div>

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  marginTop: "16px",
                }}
              >
                {itemLogs.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#999",
                      padding: "20px",
                    }}
                  >
                    No stock movement logs
                  </p>
                ) : (
                  [...itemLogs]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at || b.date) -
                        new Date(a.created_at || a.date)
                    )
                    .map((log) => (
                      <div
                        key={log.id}
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                          margin: "8px 0",
                          padding: "12px",
                          background: log.type === "in" ? "#e6ffe6" : "#ffe6e6",
                        }}
                      >
                        <div
                          style={{ fontWeight: "bold", marginBottom: "4px" }}
                        >
                          Type:{" "}
                          <span
                            style={{
                              color: log.type === "in" ? "green" : "red",
                            }}
                          >
                            {log.type === "in" ? "Stock In" : "Deduct"}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", marginBottom: "2px" }}>
                          Date: {formatTxDate(log)}
                        </div>
                        <div style={{ fontSize: "13px", marginBottom: "2px" }}>
                          Quantity: {log.quantity}
                        </div>
                        {log.type === "in" && (
                          <>
                            <div
                              style={{ fontSize: "13px", marginBottom: "2px" }}
                            >
                              Cost: {log.cost ? log.cost.toLocaleString() : "-"}
                            </div>
                            <div
                              style={{ fontSize: "13px", marginBottom: "2px" }}
                            >
                              Expires:{" "}
                              {log.expires_at
                                ? new Date(log.expires_at).toLocaleString()
                                : "None"}
                            </div>
                          </>
                        )}
                        {log.type === "out" && log.reason && (
                          <div
                            style={{ fontSize: "13px", marginBottom: "2px" }}
                          >
                            Reason: {log.reason}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {showDeductForm && stockItem && (
          <div className="modal-bg" style={{ zIndex: 1200 }}>
            <div
              className="adminboard-modal"
              style={{ maxWidth: "420px", width: "100%", textAlign: "left" }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowDeductForm(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">
                Deduct Stock - {stockItem.name}
              </span>

              <form
                className="adduser-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setStockError("");

                  // Validate available quantity
                  const { data: movs } = await supabase
                    .from("stock_movement")
                    .select(
                      "id, ingredient_id, type, quantity, cost, expires_at, date, created_at"
                    )
                    .eq("ingredient_id", stockItem.id);

                  const { quantity: availableNow } = computeAvailableQty(
                    movs || []
                  );
                  const outQty = Number(stockValues.quantity);

                  if (outQty > availableNow) {
                    setStockError(
                      `Cannot deduct more than available (${availableNow}).`
                    );
                    return;
                  }

                  setLoading(true);
                  const txData = {
                    ingredient_id: stockItem.id,
                    type: "out",
                    date: new Date().toISOString(),
                    quantity: Number(stockValues.quantity),
                    status: "completed",
                    created_at: new Date().toISOString(),
                    reason: stockValues.reason,
                  };

                  const { error } = await supabase
                    .from("stock_movement")
                    .insert([txData]);

                  if (!error) {
                    setShowDeductForm(false);
                    setStockError("");
                    await fetchItems();
                    // Mark as resolved if reason contains "expired"
                    if (
                      stockValues.reason &&
                      stockValues.reason.toLowerCase().includes("expired")
                    ) {
                      const newResolved = new Set(resolvedNotifications);
                      expiringNotifications.forEach((notif) => {
                        if (notif.item_id === stockItem.id) {
                          newResolved.add(notif.id);
                        }
                      });
                      setResolvedNotifications(newResolved);
                    }
                    // Refresh logs if modal is open
                    if (showLogsModal) {
                      const { data } = await supabase
                        .from("stock_movement")
                        .select("*")
                        .eq("ingredient_id", stockItem.id)
                        .order("date", { ascending: false });
                      if (data) setItemLogs(data);
                    }
                  }
                  setLoading(false);
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={stockValues.quantity}
                    onChange={handleStockChange}
                    min="1"
                    required
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Reason *</label>
                  <input
                    type="text"
                    name="reason"
                    value={stockValues.reason}
                    onChange={handleStockChange}
                    required
                    placeholder="e.g., expired, damaged, used in production"
                  />
                </div>

                {stockError && (
                  <div
                    style={{
                      color: "red",
                      marginBottom: "12px",
                      fontSize: "14px",
                    }}
                  >
                    {stockError}
                  </div>
                )}

                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Confirm Deduct"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showExpiredModal && (
          <div className="modal-bg" style={{ zIndex: 1200 }}>
            <div
              className="adminboard-modal"
              style={{ maxWidth: "700px", width: "100%", textAlign: "left" }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowExpiredModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">EXPIRED ITEMS</span>

              <div
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  marginTop: "16px",
                }}
              >
                {expiredItems.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#999",
                      padding: "20px",
                    }}
                  >
                    No expired items
                  </p>
                ) : (
                  expiredItems.map((exp) => (
                    <div
                      key={exp.id}
                      style={{
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        margin: "8px 0",
                        padding: "12px",
                        background: "#fee2e2",
                      }}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        {exp.item_name}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          marginBottom: "2px",
                        }}
                      >
                        Code: {exp.item_code}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#dc2626",
                          marginBottom: "2px",
                        }}
                      >
                        Expired: {exp.expired_at.toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          marginBottom: "2px",
                        }}
                      >
                        Original Quantity: {exp.quantity}
                      </div>
                      {exp.cost && (
                        <div style={{ fontSize: "13px", color: "#666" }}>
                          Cost: ₱{exp.cost}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
