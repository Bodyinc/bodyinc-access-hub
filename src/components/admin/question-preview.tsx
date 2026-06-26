import { AlignLeft, CheckSquare, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  isMcqType,
  optionLetter,
  type QuestionFormValues,
  type QuestionType,
} from "@/lib/questions.schema";

export type QuestionPreviewProps = {
  prompt?: string;
  description?: string;
  question_type?: QuestionType;
  options?: QuestionFormValues["options"];
  is_required?: boolean;
};

export function QuestionPreview({
  prompt = "",
  description = "",
  question_type = "short_text",
  options = [],
  is_required = true,
}: QuestionPreviewProps) {
  const displayPrompt = prompt.trim() || "Your question will appear here";
  const displayDescription = description?.trim();
  const filledOptions = options.filter((o) => o.label?.trim());

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Patient preview</CardTitle>
        <CardDescription>This is what patients will see in the intake quiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-relaxed">{displayPrompt}</p>
              {displayDescription && (
                <p className="text-xs leading-relaxed text-muted-foreground">{displayDescription}</p>
              )}
            </div>
            {is_required && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Required
              </Badge>
            )}
          </div>

          {question_type === "short_text" && (
            <Textarea
              disabled
              placeholder="Your answer…"
              className="resize-none bg-background"
              rows={3}
            />
          )}

          {question_type === "mcq_single" && (
            <RadioGroup disabled className="space-y-2">
              {(filledOptions.length > 0 ? filledOptions : [{ label: "Option 1" }, { label: "Option 2" }]).map(
                (opt, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <RadioGroupItem value={`opt-${index}`} id={`preview-radio-${index}`} disabled />
                    <Label htmlFor={`preview-radio-${index}`} className="font-normal">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">
                        {optionLetter(index)}.
                      </span>
                      {opt.label?.trim() || `Option ${index + 1}`}
                    </Label>
                  </div>
                ),
              )}
            </RadioGroup>
          )}

          {question_type === "mcq_multi" && (
            <div className="space-y-2">
              {(filledOptions.length > 0 ? filledOptions : [{ label: "Option 1" }, { label: "Option 2" }]).map(
                (opt, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <Checkbox id={`preview-check-${index}`} disabled />
                    <Label htmlFor={`preview-check-${index}`} className="font-normal">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">
                        {optionLetter(index)}.
                      </span>
                      {opt.label?.trim() || `Option ${index + 1}`}
                    </Label>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {question_type === "short_text" && <AlignLeft className="h-3.5 w-3.5" />}
          {question_type === "mcq_single" && <CircleDot className="h-3.5 w-3.5" />}
          {question_type === "mcq_multi" && <CheckSquare className="h-3.5 w-3.5" />}
          <span>
            {question_type === "short_text" && "Free-text response"}
            {question_type === "mcq_single" && "Pick one answer"}
            {question_type === "mcq_multi" && "Pick all that apply"}
          </span>
          {isMcqType(question_type) && (
            <span>· {filledOptions.length || 2} option{(filledOptions.length || 2) === 1 ? "" : "s"}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
