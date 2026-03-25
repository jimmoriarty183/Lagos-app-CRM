import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * DEMO ONLY - Creates test notifications for the current user.
 * Call: POST /api/inbox/seed-demo
 */
export async function POST() {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // Get user's profile (phone for order_comments)
    const { data: userProfile } = await admin
      .from("profiles")
      .select("id, phone")
      .eq("id", userId)
      .single();

    // Get user's workspace memberships
    const { data: memberships } = await admin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(5);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active workspace memberships found" },
        { status: 400 },
      );
    }

    const workspaceId = memberships[0].workspace_id;

    // Get some orders from this workspace
    const { data: orders } = await admin
      .from("orders")
      .select("id, order_number, manager_id, client_name")
      .eq("workspace_id", workspaceId)
      .limit(10);

    // Get another user for testing (for mentions, assignments, etc.)
    const { data: otherMembers } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .neq("user_id", userId)
      .limit(3);

    const otherUserId = otherMembers && otherMembers.length > 0
      ? otherMembers[0].user_id
      : userId;

    // Get other user's profile for phone
    const { data: otherUserProfile } = await admin
      .from("profiles")
      .select("id, phone")
      .eq("id", otherUserId)
      .single();

    const otherUserPhone = otherUserProfile?.phone || null;
    const currentUserPhone = userProfile?.phone || null;

    const createdNotifications: string[] = [];

    // Demo 1: Mention notification
    // Create a comment that mentions the current user
    if (orders && orders.length > 0) {
      const testOrder = orders[0];
      
      // Create a test comment that mentions the current user
      const mentionBody = `Hey @[${userId}], please review this order!`;
      
      const { data: comment, error: commentError } = await admin
        .from("order_comments")
        .insert({
          order_id: testOrder.id,
          business_id: workspaceId,
          body: mentionBody,
          author_phone: otherUserPhone,
          author_role: "MANAGER",
        })
        .select()
        .single();

      if (commentError) {
        console.error("Error creating mention comment:", commentError);
      } else if (comment) {
        // Create notification manually (trigger might not work in all cases)
        const { data: notif } = await admin
          .from("notifications")
          .insert({
            workspace_id: workspaceId,
            recipient_user_id: userId,
            actor_user_id: otherUserId,
            type: "mention_received",
            entity_type: "comment",
            entity_id: comment.id,
            order_id: testOrder.id,
            metadata: {
              comment_id: comment.id,
              order_id: testOrder.id,
              order_number: String(testOrder.order_number),
              comment_body: "Hey, please review this order!",
              author_id: otherUserId,
              author_phone: otherUserPhone,
            },
          })
          .select("id")
          .single();

        if (notif) {
          createdNotifications.push(`Mention: Order #${testOrder.order_number}`);
        }
      }
    }

    // Demo 2: Order assigned notification
    if (orders && orders.length > 1) {
      const testOrder = orders[1];
      
      // Update order to assign to current user
      await admin
        .from("orders")
        .update({ manager_id: userId })
        .eq("id", testOrder.id);

      const { data: notif } = await admin
        .from("notifications")
        .insert({
          workspace_id: workspaceId,
          recipient_user_id: userId,
          actor_user_id: otherUserId,
          type: "order_assigned",
          entity_type: "order",
          entity_id: testOrder.id,
          order_id: testOrder.id,
          metadata: {
            order_number: String(testOrder.order_number),
            previous_manager_id: null,
            assigned_by: otherUserId,
          },
        })
        .select("id")
        .single();

      if (notif) {
        createdNotifications.push(`Assigned: Order #${testOrder.order_number}`);
      }
    }

    // Demo 3: Order reassigned notification
    if (orders && orders.length > 2) {
      const testOrder = orders[2];
      
      // First set a different manager
      await admin
        .from("orders")
        .update({ manager_id: otherUserId })
        .eq("id", testOrder.id);

      // Then reassign to current user
      await admin
        .from("orders")
        .update({ manager_id: userId })
        .eq("id", testOrder.id);

      const { data: notif } = await admin
        .from("notifications")
        .insert({
          workspace_id: workspaceId,
          recipient_user_id: userId,
          actor_user_id: otherUserId,
          type: "order_reassigned",
          entity_type: "order",
          entity_id: testOrder.id,
          order_id: testOrder.id,
          metadata: {
            order_number: String(testOrder.order_number),
            previous_manager_id: otherUserId,
            assigned_by: otherUserId,
          },
        })
        .select("id")
        .single();

      if (notif) {
        createdNotifications.push(`Reassigned: Order #${testOrder.order_number}`);
      }
    }

    // Demo 4: Important comment notification
    if (orders && orders.length > 3) {
      const testOrder = orders[3];
      
      // Ensure order is assigned to current user
      await admin
        .from("orders")
        .update({ manager_id: userId })
        .eq("id", testOrder.id);

      // Create a comment from a manager/owner
      const { data: comment } = await admin
        .from("order_comments")
        .insert({
          order_id: testOrder.id,
          business_id: workspaceId,
          body: "Please update the status of this order ASAP.",
          author_phone: otherUserPhone,
          author_role: "MANAGER",
        })
        .select()
        .single();

      if (comment) {
        const { data: notif } = await admin
          .from("notifications")
          .insert({
            workspace_id: workspaceId,
            recipient_user_id: userId,
            actor_user_id: otherUserId,
            type: "important_comment_received",
            entity_type: "comment",
            entity_id: comment.id,
            order_id: testOrder.id,
            metadata: {
              comment_id: comment.id,
              order_id: testOrder.id,
              order_number: String(testOrder.order_number),
              comment_body: "Please update the status of this order ASAP.",
              author_id: otherUserId,
              author_role: "MANAGER",
              author_phone: otherUserPhone,
            },
          })
          .select("id")
          .single();

        if (notif) {
          createdNotifications.push(`Comment: Order #${testOrder.order_number}`);
        }
      }
    }

    // Demo 5: Create some older notifications (for "Earlier" section)
    const oldNotifications = [
      {
        type: "mention_received" as const,
        title: "Old mention",
        order: orders?.[4],
      },
      {
        type: "order_assigned" as const,
        title: "Old assignment",
        order: orders?.[5],
      },
    ];

    for (const oldNotif of oldNotifications) {
      if (!oldNotif.order) continue;

      const { data: notif } = await admin
        .from("notifications")
        .insert({
          workspace_id: workspaceId,
          recipient_user_id: userId,
          actor_user_id: otherUserId,
          type: oldNotif.type,
          entity_type: "order",
          entity_id: oldNotif.order.id,
          order_id: oldNotif.order.id,
          metadata: {
            order_number: String(oldNotif.order.order_number),
          },
          is_read: true,
          read_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (notif) {
        createdNotifications.push(`Earlier: ${oldNotif.title} - Order #${oldNotif.order.order_number}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Created ${createdNotifications.length} demo notifications`,
      notifications: createdNotifications,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
