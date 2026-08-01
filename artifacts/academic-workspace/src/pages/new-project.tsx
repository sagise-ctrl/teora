import { useState } from "react"
import { useLocation } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateProject } from "@workspace/api-client-react"
import { ArrowLeft, Loader2, FilePlus2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Link } from "wouter"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  instructionText: z.string().optional(),
  outputFormat: z.enum(["docx", "pdf", "markdown"]).optional().default("docx"),
  minRefYear: z.coerce.number().min(1900).max(new Date().getFullYear()).optional().or(z.literal("")),
  minRefCount: z.coerce.number().min(0).optional().or(z.literal(""))
})

type FormValues = z.infer<typeof formSchema>

export default function NewProject() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  
  const createProject = useCreateProject()
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      instructionText: "",
      outputFormat: "docx",
      minRefYear: 2018,
      minRefCount: 5
    }
  })

  function onSubmit(data: FormValues) {
    createProject.mutate({
      data: {
        title: data.title,
        instructionText: data.instructionText,
        outputFormat: data.outputFormat,
        minRefYear: data.minRefYear ? Number(data.minRefYear) : undefined,
        minRefCount: data.minRefCount ? Number(data.minRefCount) : undefined
      }
    }, {
      onSuccess: (project) => {
        toast({
          title: "Project created",
          description: "Your new workspace is ready.",
        })
        setLocation(`/projects/${project.id}`)
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Failed to create project",
          description: "An error occurred. Please try again.",
        })
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <Link href="/">
          <div className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FilePlus2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">New Project</h1>
            <p className="text-muted-foreground">Define your assignment requirements to set up the workspace.</p>
          </div>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Project Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Impact of AI on Modern Healthcare" className="text-lg py-6" {...field} />
                    </FormControl>
                    <FormDescription>A clear, descriptive title for your assignment.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste the prompt, rubric, or requirements provided by your instructor here..." 
                        className="min-h-[200px] resize-y"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>The AI will use this to guide its analysis and writing.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                <FormField
                  control={form.control}
                  name="outputFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Output Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="docx">Word Document (.docx)</SelectItem>
                          <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                          <SelectItem value="markdown">Markdown (.md)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minRefCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. References</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minRefYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Publication Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 2018" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6 flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={createProject.isPending}
                  className="font-medium min-w-[150px]"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Project"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
