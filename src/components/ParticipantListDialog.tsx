import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download, Tag, Users } from "lucide-react";
import { MaskedContact } from "@/components/MaskedContact";
import { exportParticipantsCsv } from "@/lib/exportParticipants";
import type { PublicEvent, EventRegistration } from "@/types/event";

interface ParticipantListDialogProps {
  event: PublicEvent | null;
  participants: EventRegistration[];
  loading: boolean;
  onClose: () => void;
  showCarNumbers?: boolean;
}

export function ParticipantListDialog({
  event,
  participants,
  loading,
  onClose,
  showCarNumbers = true,
}: ParticipantListDialogProps) {
  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={20} /> Participants — {event?.name}
            </DialogTitle>
            {participants.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportParticipantsCsv(
                  participants,
                  event?.registration_types || [],
                  event?.name || "event",
                  event?.run_groups || []
                )}
              >
                <Download size={14} /> Export CSV
              </Button>
            )}
          </div>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No registrations yet.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {(event?.registration_types || []).map(rt => {
              const groupParticipants = participants.filter(p => p.registration_type_id === rt.id);
              if (groupParticipants.length === 0) return null;
              return (
                <div key={rt.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Tag size={14} className="text-primary" /> {rt.name}
                      {rt.price && <span className="text-muted-foreground font-normal">({rt.price})</span>}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {groupParticipants.length}{rt.max_spots ? `/${rt.max_spots}` : ''} registered
                    </Badge>
                  </div>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {groupParticipants.map(p => (
                      <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {showCarNumbers && p.car_number != null && (
                            <Badge variant="outline" className="font-mono font-bold text-sm shrink-0">
                              #{p.car_number}
                            </Badge>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{p.user_name}</p>
                            <MaskedContact email={p.user_email} phone={p.user_phone} />
                            {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Total: {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
